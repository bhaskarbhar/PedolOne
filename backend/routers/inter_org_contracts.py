import os
import json
import uuid
import hashlib
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta
from fastapi.encoders import jsonable_encoder
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List, Optional

from models import (
    InterOrgContract, CreateInterOrgContract, UpdateInterOrgContract, RespondToContract,
    ContractResource, ContractUpdateRequest, ContractDeletionRequest, ContractActionRequest, ContractVersion, ContractAuditLog
)
from helpers import users_collection, policies_collection, logs_collection
from jwt_utils import get_current_user, TokenData
from routers.websocket import send_user_update

load_dotenv()

router = APIRouter(prefix="/inter-org-contracts", tags=["Inter-Organization Contracts"])

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_database("PedolOne")

# Collections
inter_org_contracts_collection = db.get_collection("inter_org_contracts")
organizations_collection = db.get_collection("organizations")
contract_versions_collection = db.get_collection("contract_versions")
contract_audit_logs_collection = db.get_collection("contract_audit_logs")

# Create indexes
inter_org_contracts_collection.create_index([("source_org_id", 1), ("target_org_id", 1)])
inter_org_contracts_collection.create_index([("approval_status", 1)])
inter_org_contracts_collection.create_index("ends_at", expireAfterSeconds=0)

def get_organization_by_id(org_id: str):
    """Get organization by ID"""
    return organizations_collection.find_one({"org_id": org_id})

def generate_resource_signature(resource_name: str, purpose: List[str], retention_window: str, created_at: datetime, ends_at: datetime) -> str:
    """Generate a unique signature for a resource"""
    signature_data = f"{resource_name}:{','.join(purpose)}:{retention_window}:{created_at.isoformat()}:{ends_at.isoformat()}"
    return hashlib.sha256(signature_data.encode()).hexdigest()

def log_contract_action(contract_id: str, action_type: str, action_by: int, action_by_org_id: str, 
                       action_details: dict, ip_address: str = None, user_agent: str = None):
    """Log contract actions for audit trail"""
    log_entry = ContractAuditLog(
        contract_id=contract_id,
        action_type=action_type,
        action_by=action_by,
        action_by_org_id=action_by_org_id,
        action_details=action_details,
        timestamp=datetime.utcnow(),
        ip_address=ip_address,
        user_agent=user_agent
    )
    # Exclude the id field to let MongoDB generate a new _id
    log_data = log_entry.model_dump(by_alias=True, exclude={"id"})
    contract_audit_logs_collection.insert_one(log_data)

def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    if request:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        elif request.headers.get("X-Real-IP"):
            return request.headers.get("X-Real-IP")
        elif request.client:
            return request.client.host
    return "unknown"

@router.post("/create")
async def create_inter_org_contract(
    contract_data: CreateInterOrgContract,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Create a new inter-organization contract"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can create contracts")
    
    # Get source organization details
    source_org = get_organization_by_id(user.get("organization_id"))
    if not source_org:
        raise HTTPException(status_code=404, detail="Source organization not found")
    
    # Get target organization details
    target_org = get_organization_by_id(contract_data.target_org_id)
    if not target_org:
        raise HTTPException(status_code=404, detail="Target organization not found")
    
    # Check if a contract with the same name already exists between these organizations
    existing_contract = inter_org_contracts_collection.find_one({
        "$or": [
            {"source_org_id": source_org["org_id"], "target_org_id": target_org["org_id"]},
            {"source_org_id": target_org["org_id"], "target_org_id": source_org["org_id"]}
        ],
        "contract_name": contract_data.contract_name,
        "status": {"$in": ["active", "pending"]}
    })
    
    if existing_contract:
        raise HTTPException(status_code=400, detail=f"A contract with name '{contract_data.contract_name}' already exists between these organizations")
    
    # Create contract
    contract_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    ends_at = contract_data.ends_at or (created_at + timedelta(days=365))  # Use provided end date or 1 year default
    
    # Process resources and generate signatures
    processed_resources = []
    for resource in contract_data.resources_allowed:
        # Generate signature for the resource
        signature = generate_resource_signature(
            resource.resource_name,
            resource.purpose,
            resource.retention_window,
            resource.created_at,
            resource.ends_at
        )
        
        processed_resource = ContractResource(
            resource_name=resource.resource_name,
            purpose=resource.purpose,
            retention_window=resource.retention_window,
            created_at=resource.created_at,
            ends_at=resource.ends_at,
            signature=signature
        )
        processed_resources.append(processed_resource)
    
    contract = InterOrgContract(
        contract_id=contract_id,
        contract_name=contract_data.contract_name,
        contract_type=contract_data.contract_type,
        contract_description=contract_data.contract_description,
        source_org_id=source_org["org_id"],
        source_org_name=source_org["org_name"],
        target_org_id=target_org["org_id"],
        target_org_name=target_org["org_name"],
        created_at=created_at,
        ends_at=ends_at,
        resources_allowed=processed_resources,
        status="pending",
        approval_status="pending",
        approval_message=contract_data.approval_message,
        version="1.0"
    )
    
    # Insert into database - exclude id field to let MongoDB generate new _id
    contract_data = contract.model_dump(by_alias=True, exclude={"id"})
    result = inter_org_contracts_collection.insert_one(contract_data)
    
    # Send WebSocket notification to target organization
    await send_user_update(
        user_id=str(target_org["org_id"]),
        update_type="contract_request_received",
        data={"contract": contract.model_dump()}
    )
    
    # Log the contract creation
    client_ip = get_client_ip(http_request)
    
    # Get resource names for logging
    resource_names = [r.resource_name for r in contract.resources_allowed]
    purposes = []
    for resource in contract.resources_allowed:
        purposes.extend(resource.purpose)
    
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": source_org["org_name"],
        "resource_name": ", ".join(resource_names),
        "purpose": purposes,
        "log_type": "contract_creation",
        "ip_address": client_ip,
        "data_source": "organization",
        "source_org_id": source_org["org_id"],
        "target_org_id": target_org["org_id"],
        "created_at": created_at,
        "contract_id": contract_id,
        "contract_name": contract.contract_name,
        "contract_type": contract.contract_type
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "Inter-organization contract created successfully",
        "contract_id": contract_id,
        "contract_name": contract.contract_name,
        "status": "pending"
    }

@router.get("/org/{org_id}")
async def get_organization_contracts(org_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get all contracts for an organization (both sent and received)"""
    
    # Verify user is admin of this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get organization details
    org = get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Get contracts where this org is the source (sent contracts) - exclude deleted contracts
    sent_contracts = list(inter_org_contracts_collection.find({
        "source_org_id": org_id,
        "status": {"$ne": "deleted"}
    }))
    
    # Get contracts where this org is the target (received contracts) - exclude deleted contracts
    received_contracts = list(inter_org_contracts_collection.find({
        "target_org_id": org_id,
        "status": {"$ne": "deleted"}
    }))
    
    # Combine and sort by created_at (newest first)
    all_contracts = sent_contracts + received_contracts
    all_contracts.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    
    # Format response
    formatted_contracts = []
    for contract in all_contracts:
        is_requester = contract["source_org_id"] == org_id
        
        # Format resources_allowed
        formatted_resources = []
        
        # Handle both old and new contract structures
        if contract.get("resources_allowed"):
            # New structure with ContractResource objects
            for resource in contract.get("resources_allowed", []):
                if isinstance(resource, dict) and "resource_name" in resource:
                    formatted_resources.append({
                        "resource_name": resource["resource_name"],
                        "purpose": resource.get("purpose", []),
                        "retention_window": resource.get("retention_window", "30 days"),
                        "created_at": resource.get("created_at", contract["created_at"]).isoformat() if isinstance(resource.get("created_at", contract["created_at"]), datetime) else resource.get("created_at", contract["created_at"]),
                        "ends_at": resource.get("ends_at", contract.get("ends_at", contract.get("expires_at"))).isoformat() if isinstance(resource.get("ends_at", contract.get("ends_at", contract.get("expires_at"))), datetime) else resource.get("ends_at", contract.get("ends_at", contract.get("expires_at"))),
                        "signature": resource.get("signature", "")
                    })
                else:
                    # Fallback if resource is just a string
                    formatted_resources.append({
                        "resource_name": str(resource),
                        "purpose": [],
                        "retention_window": "30 days",
                        "created_at": contract["created_at"].isoformat(),
                        "ends_at": contract.get("ends_at", contract.get("expires_at")).isoformat(),
                        "signature": ""
                    })
        elif contract.get("allowed_resources"):
            # Old structure with simple list
            allowed_resources = contract.get("allowed_resources", [])
            if isinstance(allowed_resources, str):
                allowed_resources = [allowed_resources]
            
            for resource in allowed_resources:
                formatted_resources.append({
                    "resource_name": str(resource),
                    "purpose": contract.get("purposes", []),
                    "retention_window": contract.get("retention_window", "30 days"),
                    "created_at": contract["created_at"].isoformat(),
                    "ends_at": contract.get("ends_at", contract.get("expires_at")).isoformat(),
                    "signature": ""
                })
        
        formatted_contracts.append({
            "contract_id": contract["contract_id"],
            "contract_name": contract.get("contract_name", "Legacy Contract"),
            "contract_type": contract.get("contract_type", "data_sharing"),
            "contract_description": contract.get("contract_description"),
            "version": contract.get("version", "1.0"),
            "source_org_id": contract["source_org_id"],
            "source_org_name": contract["source_org_name"],
            "target_org_id": contract["target_org_id"],
            "target_org_name": contract["target_org_name"],
            "resources_allowed": formatted_resources,
            "status": contract["status"],
            "approval_status": contract.get("approval_status", "pending"),
            "approval_message": contract.get("approval_message"),
            "created_at": contract["created_at"].isoformat(),
            "ends_at": contract.get("ends_at", contract.get("expires_at")).isoformat(),
            "approved_at": contract.get("approved_at").isoformat() if contract.get("approved_at") else None,
            "approved_by": contract.get("approved_by"),
            "is_update": contract.get("is_update", False),
            "original_contract_id": contract.get("original_contract_id"),
            "update_reason": contract.get("update_reason"),
            "parent_contract_id": contract.get("parent_contract_id"),
            "is_requester": is_requester
        })
    
    return formatted_contracts

@router.post("/update")
async def update_inter_org_contract(
    update_data: UpdateInterOrgContract,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Update an existing inter-organization contract"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can update contracts")
    
    # Get the original contract
    original_contract = inter_org_contracts_collection.find_one({"contract_id": update_data.contract_id})
    if not original_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user is admin of the source organization
    if original_contract["source_org_id"] != user.get("organization_id"):
        raise HTTPException(status_code=403, detail="Only the source organization can update this contract")
    
    # Check if contract is active
    if original_contract["status"] != "active":
        raise HTTPException(status_code=400, detail="Only active contracts can be updated")
    
    # Create update contract
    update_contract_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    ends_at = original_contract.get("ends_at", original_contract.get("expires_at"))
    
    # Use updated resources if provided, otherwise use original
    resources_to_use = update_data.resources_allowed if update_data.resources_allowed else original_contract["resources_allowed"]
    
    # Process resources and generate signatures if new resources provided
    processed_resources = []
    for resource in resources_to_use:
        if update_data.resources_allowed:
            # Generate new signature for updated resource
            signature = generate_resource_signature(
                resource.resource_name,
                resource.purpose,
                resource.retention_window,
                resource.created_at,
                resource.ends_at
            )
            
            processed_resource = ContractResource(
                resource_name=resource.resource_name,
                purpose=resource.purpose,
                retention_window=resource.retention_window,
                created_at=resource.created_at,
                ends_at=resource.ends_at,
                signature=signature
            )
        else:
            # Use original resource as is
            processed_resource = ContractResource(
                resource_name=resource["resource_name"],
                purpose=resource["purpose"],
                retention_window=resource["retention_window"],
                created_at=resource["created_at"],
                ends_at=resource["ends_at"],
                signature=resource["signature"]
            )
        processed_resources.append(processed_resource)
    
    # Create the update contract
    update_contract = InterOrgContract(
        contract_id=update_contract_id,
        source_org_id=original_contract["source_org_id"],
        source_org_name=original_contract["source_org_name"],
        target_org_id=original_contract["target_org_id"],
        target_org_name=original_contract["target_org_name"],
        created_at=created_at,
        ends_at=ends_at,
        resources_allowed=processed_resources,
        status="pending",
        approval_status="pending",
        approval_message=update_data.update_reason,
        is_update=True,
        original_contract_id=original_contract["contract_id"],
        update_reason=update_data.update_reason
    )
    
    # Insert update contract - exclude id field to let MongoDB generate new _id
    update_contract_data = update_contract.model_dump(by_alias=True, exclude={"id"})
    result = inter_org_contracts_collection.insert_one(update_contract_data)
    
    # Send WebSocket notification to target organization
    await send_user_update(
        user_id=str(original_contract["target_org_id"]),
        update_type="contract_update_received",
        data={"contract": update_contract.model_dump()}
    )
    
    return {
        "message": "Contract update request created successfully",
        "update_contract_id": update_contract_id,
        "status": "pending"
    }

@router.post("/respond")
async def respond_to_contract(
    response_data: RespondToContract,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Respond to a contract request (approve/reject)"""
    
    # Get the contract
    contract = inter_org_contracts_collection.find_one({"contract_id": response_data.contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user is admin of the target organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can respond to contracts")
    
    if contract["target_org_id"] != user.get("organization_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if contract is still pending
    if contract["approval_status"] != "pending":
        raise HTTPException(status_code=400, detail="Contract has already been responded to")
    
    # Update contract
    update_data = {
        "approval_status": response_data.status,
        "approved_at": datetime.utcnow(),
        "approved_by": current_user.user_id
    }
    
    if response_data.status == "approved":
        update_data["status"] = "active"
        
        # If this is an update, also update the original contract
        if contract.get("is_update") and contract.get("original_contract_id"):
            original_contract = inter_org_contracts_collection.find_one({"contract_id": contract["original_contract_id"]})
            if original_contract:
                # Update original contract with new terms
                original_update = {
                    "resources_allowed": contract["resources_allowed"]
                }
                
                inter_org_contracts_collection.update_one(
                    {"contract_id": contract["original_contract_id"]},
                    {"$set": original_update}
                )
    
    inter_org_contracts_collection.update_one(
        {"contract_id": response_data.contract_id},
        {"$set": update_data}
    )
    
    # Send WebSocket notification to source organization
    await send_user_update(
        user_id=str(contract["source_org_id"]),
        update_type="contract_responded",
        data={
            "contract_id": response_data.contract_id,
            "status": response_data.status,
            "response_message": response_data.response_message
        }
    )
    
    # Log the response
    client_ip = get_client_ip(http_request)
    
    # Get resource names and purposes for logging
    resource_names = []
    purposes = []
    
    # Handle both old and new contract structures
    if contract.get("resources_allowed"):
        # New structure with ContractResource objects
        for resource in contract.get("resources_allowed", []):
            if isinstance(resource, dict) and "resource_name" in resource:
                resource_names.append(resource["resource_name"])
                purposes.extend(resource.get("purpose", []))
            else:
                resource_names.append(str(resource))
    elif contract.get("allowed_resources"):
        # Old structure with simple list
        allowed_resources = contract.get("allowed_resources", [])
        if isinstance(allowed_resources, str):
            resource_names = [allowed_resources]
        else:
            resource_names = allowed_resources
        purposes = contract.get("purposes", [])
    
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": contract["source_org_name"],
        "resource_name": ", ".join(resource_names),
        "purpose": purposes,
        "log_type": f"contract_request_{response_data.status}",
        "ip_address": client_ip,
        "data_source": "organization",
        "source_org_id": contract["source_org_id"],
        "target_org_id": contract["target_org_id"],
        "created_at": datetime.utcnow(),
        "contract_id": response_data.contract_id,
        "response_status": response_data.status
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": f"Contract {response_data.status} successfully",
        "contract_id": response_data.contract_id,
        "status": response_data.status
    }

@router.get("/active/{org_id}")
async def get_active_contracts(org_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get all active contracts for an organization"""
    
    # Verify user is admin of this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get active contracts
    active_contracts = list(inter_org_contracts_collection.find({
        "$or": [
            {"source_org_id": org_id},
            {"target_org_id": org_id}
        ],
        "status": "active"
    }))
    
    # Format response
    formatted_contracts = []
    for contract in active_contracts:
        # Format resources_allowed
        formatted_resources = []
        
        # Handle both old and new contract structures
        if contract.get("resources_allowed"):
            # New structure with ContractResource objects
            for resource in contract.get("resources_allowed", []):
                if isinstance(resource, dict) and "resource_name" in resource:
                    formatted_resources.append({
                        "resource_name": resource["resource_name"],
                        "purpose": resource.get("purpose", []),
                        "retention_window": resource.get("retention_window", "30 days"),
                        "created_at": resource.get("created_at", contract["created_at"]).isoformat() if isinstance(resource.get("created_at", contract["created_at"]), datetime) else resource.get("created_at", contract["created_at"]),
                        "ends_at": resource.get("ends_at", contract.get("ends_at", contract.get("expires_at"))).isoformat() if isinstance(resource.get("ends_at", contract.get("ends_at", contract.get("expires_at"))), datetime) else resource.get("ends_at", contract.get("ends_at", contract.get("expires_at"))),
                        "signature": resource.get("signature", "")
                    })
                else:
                    # Fallback if resource is just a string
                    formatted_resources.append({
                        "resource_name": str(resource),
                        "purpose": [],
                        "retention_window": "30 days",
                        "created_at": contract["created_at"].isoformat(),
                        "ends_at": contract.get("ends_at", contract.get("expires_at")).isoformat(),
                        "signature": ""
                    })
        elif contract.get("allowed_resources"):
            # Old structure with simple list
            allowed_resources = contract.get("allowed_resources", [])
            if isinstance(allowed_resources, str):
                allowed_resources = [allowed_resources]
            
            for resource in allowed_resources:
                formatted_resources.append({
                    "resource_name": str(resource),
                    "purpose": contract.get("purposes", []),
                    "retention_window": contract.get("retention_window", "30 days"),
                    "created_at": contract["created_at"].isoformat(),
                    "ends_at": contract.get("ends_at", contract.get("expires_at")).isoformat(),
                    "signature": ""
                })
        
        formatted_contracts.append({
            "contract_id": contract["contract_id"],
            "source_org_id": contract["source_org_id"],
            "source_org_name": contract["source_org_name"],
            "target_org_id": contract["target_org_id"],
            "target_org_name": contract["target_org_name"],
            "resources_allowed": formatted_resources,
            "created_at": contract["created_at"].isoformat(),
            "ends_at": contract.get("ends_at", contract.get("expires_at")).isoformat()
        })
    
    return formatted_contracts 

@router.get("/contract-types")
async def get_contract_types():
    """Get available contract types and their configurations"""
    
    contract_types = [
        {
            "type_id": "data_sharing",
            "name": "Data Sharing",
            "description": "Contract for sharing PII and sensitive data between organizations",
            "allowed_resources": [
                "aadhaar", "pan", "account", "ifsc", "creditcard", "debitcard", 
                "gst", "itform16", "upi", "passport", "drivinglicense"
            ],
            "default_retention": "30 days"
        },
        {
            "type_id": "file_sharing",
            "name": "File Sharing",
            "description": "Contract for secure document and file exchange",
            "allowed_resources": [
                "excel", "pdf", "doc", "docx", "csv", "json", "xml"
            ],
            "default_retention": "90 days"
        },
        {
            "type_id": "service_integration",
            "name": "Service Integration",
            "description": "Contract for API and service access between organizations",
            "allowed_resources": [
                "api_access", "webhook", "database", "storage"
            ],
            "default_retention": "1 year"
        },
        {
            "type_id": "compliance_reporting",
            "name": "Compliance Reporting",
            "description": "Contract for regulatory compliance and reporting",
            "allowed_resources": [
                "audit_logs", "compliance_data", "regulatory_reports", "kyc_data"
            ],
            "default_retention": "5 years"
        }
    ]
    
    return {"contract_types": contract_types}

@router.put("/update")
async def update_contract(
    update_data: ContractUpdateRequest,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Update an existing contract (requires approval from other organization)"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can update contracts")
    
    # Get the existing contract
    existing_contract = inter_org_contracts_collection.find_one({"contract_id": update_data.contract_id})
    if not existing_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user belongs to one of the organizations in the contract
    user_org_id = user.get("organization_id")
    if user_org_id not in [existing_contract["source_org_id"], existing_contract["target_org_id"]]:
        raise HTTPException(status_code=403, detail="You can only update contracts involving your organization")
    
    # Check if contract is active and can be updated
    if existing_contract.get("status") != "active":
        raise HTTPException(status_code=400, detail="Only active contracts can be updated")
    
    # Create a new version of the contract
    version_id = str(uuid.uuid4())
    current_version = existing_contract.get("version", "1.0")
    
    # Parse version and increment
    try:
        major, minor = map(int, current_version.split("."))
        new_version = f"{major}.{minor + 1}"
    except:
        new_version = "1.1"
    
    # Prepare updated contract data
    updated_contract_data = {
        "contract_id": existing_contract["contract_id"],
        "contract_name": update_data.contract_name or existing_contract.get("contract_name", "Legacy Contract"),
        "contract_description": update_data.contract_description or existing_contract.get("contract_description"),
        "contract_type": update_data.contract_type or existing_contract.get("contract_type", "data_sharing"),
        "version": new_version,
        "parent_version_id": existing_contract.get("version_id"),
        "resources_allowed": update_data.resources_allowed or existing_contract.get("resources_allowed", []),
        "source_org_id": existing_contract["source_org_id"],
        "source_org_name": existing_contract["source_org_name"],
        "target_org_id": existing_contract["target_org_id"],
        "target_org_name": existing_contract["target_org_name"],
        "created_at": datetime.utcnow(),
        "created_by": current_user.user_id,
        "requested_by": current_user.user_id,
        "requested_by_org_id": user_org_id,
        "approval_status": "pending",
        "change_summary": update_data.approval_message or "Contract update requested",
        "is_update_request": True,
        "original_contract_id": existing_contract["contract_id"]
    }
    
    # Create contract version record
    contract_version = ContractVersion(
        version_id=version_id,
        version_number=new_version,
        contract_id=existing_contract["contract_id"],
        contract_name=updated_contract_data["contract_name"],
        contract_description=updated_contract_data["contract_description"],
        contract_type=updated_contract_data["contract_type"],
        resources_allowed=updated_contract_data["resources_allowed"],
        created_at=datetime.utcnow(),
        created_by=current_user.user_id,
        parent_version_id=existing_contract.get("version_id"),
        change_summary=updated_contract_data["change_summary"]
    )
    
    # Insert the new version - exclude id field to let MongoDB generate new _id
    contract_version_data = contract_version.model_dump(by_alias=True, exclude={"id"})
    contract_versions_collection.insert_one(contract_version_data)
    
    # Update the main contract with the update request
    inter_org_contracts_collection.update_one(
        {"contract_id": existing_contract["contract_id"]},
        {"$set": updated_contract_data}
    )
    
    # Log the update request
    client_ip = get_client_ip(http_request)
    log_contract_action(
        contract_id=existing_contract["contract_id"],
        action_type="update_requested",
        action_by=current_user.user_id,
        action_by_org_id=user_org_id,
        action_details={
            "new_version": new_version,
            "changes": {
                "contract_name": update_data.contract_name,
                "contract_description": update_data.contract_description,
                "contract_type": update_data.contract_type,
                "resources_allowed": update_data.resources_allowed
            },
            "approval_message": update_data.approval_message
        },
        ip_address=client_ip,
        user_agent=http_request.headers.get("User-Agent") if http_request else None
    )
    
    # Also log to main contract logs collection
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": existing_contract["source_org_name"],
        "resource_name": "Contract Update",
        "purpose": ["contract_management"],
        "log_type": "contract_update",
        "ip_address": client_ip,
        "data_source": "organization",
        "source_org_id": existing_contract["source_org_id"],
        "target_org_id": existing_contract["target_org_id"],
        "created_at": datetime.utcnow(),
        "contract_id": existing_contract["contract_id"],
        "contract_name": update_data.contract_name or existing_contract["contract_name"],
        "contract_type": update_data.contract_type or existing_contract["contract_type"],
        "update_version": new_version,
        "update_reason": update_data.approval_message
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "Contract update request created successfully",
        "version_id": version_id,
        "new_version": new_version,
        "approval_status": "pending"
    }

@router.delete("/delete")
async def request_contract_deletion(
    deletion_data: ContractDeletionRequest,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Request deletion of a contract (requires approval from other organization)"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can delete contracts")
    
    # Get the existing contract
    existing_contract = inter_org_contracts_collection.find_one({"contract_id": deletion_data.contract_id})
    if not existing_contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user belongs to one of the organizations in the contract
    user_org_id = user.get("organization_id")
    if user_org_id not in [existing_contract["source_org_id"], existing_contract["target_org_id"]]:
        raise HTTPException(status_code=403, detail="You can only delete contracts involving your organization")
    
    # Check if contract is active and can be deleted
    if existing_contract.get("status") != "active":
        raise HTTPException(status_code=400, detail="Only active contracts can be deleted")
    
    # Create deletion request
    deletion_request = {
        "contract_id": existing_contract["contract_id"],
        "deletion_reason": deletion_data.deletion_reason,
        "requested_by": current_user.user_id,
        "requested_by_org_id": user_org_id,
        "requested_at": datetime.utcnow(),
        "approval_status": "pending",
        "approval_message": deletion_data.approval_message,
        "is_deletion_request": True
    }
    
    # Update the contract with deletion request
    inter_org_contracts_collection.update_one(
        {"contract_id": deletion_data.contract_id},
        {"$set": deletion_request}
    )
    
    # Log the deletion request
    client_ip = get_client_ip(http_request)
    log_contract_action(
        contract_id=existing_contract["contract_id"],
        action_type="deletion_requested",
        action_by=current_user.user_id,
        action_by_org_id=user_org_id,
        action_details={
            "deletion_reason": deletion_data.deletion_reason,
            "approval_message": deletion_data.approval_message
        },
        ip_address=client_ip,
        user_agent=http_request.headers.get("User-Agent") if http_request else None
    )
    
    # Also log to main contract logs collection
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": existing_contract["source_org_name"],
        "resource_name": "Contract Deletion",
        "purpose": ["contract_management"],
        "log_type": "contract_deletion",
        "ip_address": client_ip,
        "data_source": "organization",
        "source_org_id": existing_contract["source_org_id"],
        "target_org_id": existing_contract["target_org_id"],
        "created_at": datetime.utcnow(),
        "contract_id": existing_contract["contract_id"],
        "contract_name": existing_contract["contract_name"],
        "contract_type": existing_contract["contract_type"],
        "deletion_reason": deletion_data.deletion_reason,
        "approval_message": deletion_data.approval_message
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "Contract deletion request created successfully",
        "approval_status": "pending"
    }

@router.post("/approve-action")
async def approve_contract_action(
    action_data: ContractActionRequest,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Approve or reject contract actions (updates, deletions)"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can approve contract actions")
    
    # Get the contract
    contract = inter_org_contracts_collection.find_one({"contract_id": action_data.contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user belongs to the other organization (not the one that initiated the action)
    user_org_id = user.get("organization_id")
    if user_org_id not in [contract["source_org_id"], contract["target_org_id"]]:
        raise HTTPException(status_code=403, detail="You can only approve actions for contracts involving your organization")

    # Prevent same org from approving its own request
    if contract.get("is_update_request") and contract.get("requested_by_org_id") == user_org_id:
        raise HTTPException(status_code=403, detail="You cannot approve your own contract update request.")
    if contract.get("is_deletion_request") and contract.get("requested_by_org_id") == user_org_id:
        raise HTTPException(status_code=403, detail="You cannot approve your own contract deletion request.")
    
    # Check if there's a pending action
    if not contract.get("is_update_request") and not contract.get("is_deletion_request"):
        raise HTTPException(status_code=400, detail="No pending action found for this contract")
    
    client_ip = get_client_ip(http_request)
    
    if action_data.status == "approved":
        if contract.get("is_update_request"):
            # Approve contract update
            version_id = contract.get("version_id")
            if version_id:
                # Update the contract version status
                contract_versions_collection.update_one(
                    {"version_id": version_id},
                    {
                        "$set": {
                            "approval_status": "approved",
                            "approved_by": current_user.user_id,
                            "approved_at": datetime.utcnow()
                        }
                    }
                )
                
                # Apply the update to the main contract
                inter_org_contracts_collection.update_one(
                    {"contract_id": action_data.contract_id},
                    {
                        "$set": {
                            "contract_name": contract.get("contract_name"),
                            "contract_description": contract.get("contract_description"),
                            "contract_type": contract.get("contract_type"),
                            "version": contract.get("version"),
                            "resources_allowed": contract.get("resources_allowed"),
                            "approval_status": "approved",
                            "is_update_request": False
                        }
                    }
                )
                
                log_contract_action(
                    contract_id=action_data.contract_id,
                    action_type="update_approved",
                    action_by=current_user.user_id,
                    action_by_org_id=user_org_id,
                    action_details={
                        "version": contract.get("version"),
                        "response_message": action_data.response_message
                    },
                    ip_address=client_ip,
                    user_agent=http_request.headers.get("User-Agent") if http_request else None
                )
                
                return {"message": "Contract update approved successfully"}
        
        elif contract.get("is_deletion_request"):
            # Approve contract deletion
            inter_org_contracts_collection.update_one(
                {"contract_id": action_data.contract_id},
                {
                    "$set": {
                        "status": "deleted",
                        "deleted_at": datetime.utcnow(),
                        "deleted_by": current_user.user_id,
                        "approval_status": "approved",
                        "is_deletion_request": False
                    }
                }
            )
            
            log_contract_action(
                contract_id=action_data.contract_id,
                action_type="deletion_approved",
                action_by=current_user.user_id,
                action_by_org_id=user_org_id,
                action_details={
                    "response_message": action_data.response_message
                },
                ip_address=client_ip,
                user_agent=http_request.headers.get("User-Agent") if http_request else None
            )
            
            return {"message": "Contract deletion approved successfully"}
    
    elif action_data.status == "rejected":
        # Reject the action
        if contract.get("is_update_request"):
            # Reject contract update
            version_id = contract.get("version_id")
            if version_id:
                contract_versions_collection.update_one(
                    {"version_id": version_id},
                    {
                        "$set": {
                            "approval_status": "rejected",
                            "rejection_reason": action_data.response_message
                        }
                    }
                )
            
            inter_org_contracts_collection.update_one(
                {"contract_id": action_data.contract_id},
                {
                    "$set": {
                        "approval_status": "rejected",
                        "is_update_request": False,
                        "rejection_reason": action_data.response_message
                    }
                }
            )
            
            log_contract_action(
                contract_id=action_data.contract_id,
                action_type="update_rejected",
                action_by=current_user.user_id,
                action_by_org_id=user_org_id,
                action_details={
                    "rejection_reason": action_data.response_message
                },
                ip_address=client_ip,
                user_agent=http_request.headers.get("User-Agent") if http_request else None
            )
            
            return {"message": "Contract update rejected"}
        
        elif contract.get("is_deletion_request"):
            # Reject contract deletion
            inter_org_contracts_collection.update_one(
                {"contract_id": action_data.contract_id},
                {
                    "$set": {
                        "approval_status": "rejected",
                        "is_deletion_request": False,
                        "rejection_reason": action_data.response_message
                    }
                }
            )
            
            log_contract_action(
                contract_id=action_data.contract_id,
                action_type="deletion_rejected",
                action_by=current_user.user_id,
                action_by_org_id=user_org_id,
                action_details={
                    "rejection_reason": action_data.response_message
                },
                ip_address=client_ip,
                user_agent=http_request.headers.get("User-Agent") if http_request else None
            )
            
            return {"message": "Contract deletion rejected"}
    
    raise HTTPException(status_code=400, detail="Invalid action status")

@router.get("/versions/{contract_id}")
async def get_contract_versions(
    contract_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Get version history for a contract"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can view contract versions")
    
    # Get the contract
    contract = inter_org_contracts_collection.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user belongs to one of the organizations in the contract
    user_org_id = user.get("organization_id")
    if user_org_id not in [contract["source_org_id"], contract["target_org_id"]]:
        raise HTTPException(status_code=403, detail="You can only view versions for contracts involving your organization")
    
    # Get all versions for this contract
    versions = list(contract_versions_collection.find({"contract_id": contract_id}).sort("created_at", -1))
    
    # Format versions
    formatted_versions = []
    for version in versions:
        formatted_versions.append({
            "version_id": version["version_id"],
            "version_number": version["version_number"],
            "contract_name": version["contract_name"],
            "contract_description": version.get("contract_description"),
            "contract_type": version["contract_type"],
            "created_at": version["created_at"].isoformat(),
            "created_by": version["created_by"],
            "approval_status": version.get("approval_status", "pending"),
            "change_summary": version.get("change_summary"),
            "approved_by": version.get("approved_by"),
            "approved_at": version.get("approved_at"),
            "rejection_reason": version.get("rejection_reason")
        })
    
    return {"versions": formatted_versions}

@router.get("/audit-logs/{contract_id}")
async def get_contract_audit_logs(
    contract_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Get audit logs for a contract"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can view contract audit logs")
    
    # Get the contract
    contract = inter_org_contracts_collection.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user belongs to one of the organizations in the contract
    user_org_id = user.get("organization_id")
    if user_org_id not in [contract["source_org_id"], contract["target_org_id"]]:
        raise HTTPException(status_code=403, detail="You can only view audit logs for contracts involving your organization")
    
    # Get audit logs for this contract
    logs = list(contract_audit_logs_collection.find({"contract_id": contract_id}).sort("timestamp", -1))
    
    # Format logs
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": str(log["_id"]),
            "action_type": log["action_type"],
            "action_by": log["action_by"],
            "action_by_org_id": log["action_by_org_id"],
            "action_details": log["action_details"],
            "timestamp": log["timestamp"].isoformat(),
            "ip_address": log.get("ip_address"),
            "user_agent": log.get("user_agent")
        })
    
    return {"audit_logs": formatted_logs} 