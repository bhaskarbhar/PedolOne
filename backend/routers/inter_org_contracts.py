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
    ContractResource
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
    
    # Check if contract already exists
    existing_contract = inter_org_contracts_collection.find_one({
        "$or": [
            {"source_org_id": source_org["org_id"], "target_org_id": target_org["org_id"]},
            {"source_org_id": target_org["org_id"], "target_org_id": source_org["org_id"]}
        ],
        "status": {"$in": ["active", "pending"]}
    })
    
    if existing_contract:
        raise HTTPException(status_code=400, detail="Contract already exists between these organizations")
    
    # Create contract
    contract_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    ends_at = created_at + timedelta(days=365)  # 1 year default
    
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
        source_org_id=source_org["org_id"],
        source_org_name=source_org["org_name"],
        target_org_id=target_org["org_id"],
        target_org_name=target_org["org_name"],
        created_at=created_at,
        ends_at=ends_at,
        resources_allowed=processed_resources,
        status="pending",
        approval_status="pending",
        approval_message=contract_data.approval_message
    )
    
    # Insert into database
    result = inter_org_contracts_collection.insert_one(contract.model_dump(by_alias=True))
    
    # Send WebSocket notification to target organization
    await send_user_update(
        user_id=str(target_org["org_id"]),
        update_type="contract_request_received",
        data={"contract": contract.model_dump()}
    )
    
    # Log the contract creation
    client_ip = "unknown"
    if http_request:
        forwarded_for = http_request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif http_request.headers.get("X-Real-IP"):
            client_ip = http_request.headers.get("X-Real-IP")
        elif http_request.client:
            client_ip = http_request.client.host
    
    # Get resource names for logging
    resource_names = [r.resource_name for r in contract_data.resources_allowed]
    purposes = []
    for resource in contract_data.resources_allowed:
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
        "contract_id": contract_id
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "Inter-organization contract created successfully",
        "contract_id": contract_id,
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
    
    # Get contracts where this org is the source (sent contracts)
    sent_contracts = list(inter_org_contracts_collection.find({
        "source_org_id": org_id
    }))
    
    # Get contracts where this org is the target (received contracts)
    received_contracts = list(inter_org_contracts_collection.find({
        "target_org_id": org_id
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
    
    # Insert update contract
    result = inter_org_contracts_collection.insert_one(update_contract.model_dump(by_alias=True))
    
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
    client_ip = "unknown"
    if http_request:
        forwarded_for = http_request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif http_request.headers.get("X-Real-IP"):
            client_ip = http_request.headers.get("X-Real-IP")
        elif http_request.client:
            client_ip = http_request.client.host
    
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
        "log_type": "contract_response",
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