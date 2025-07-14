import os
import json
import uuid
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta
from fastapi.encoders import jsonable_encoder
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List, Optional

from models import InterOrgContract, CreateInterOrgContract
from helpers import users_collection, logs_collection
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
inter_org_contracts_collection.create_index("expires_at", expireAfterSeconds=0)
inter_org_contracts_collection.create_index([("source_org_id", 1), ("target_org_id", 1)])

def get_organization_by_id(org_id: str):
    """Get organization by ID"""
    return organizations_collection.find_one({"org_id": org_id})

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
    
    source_org_id = user.get("organization_id")
    if not source_org_id:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Get source organization details
    source_org = get_organization_by_id(source_org_id)
    if not source_org:
        raise HTTPException(status_code=404, detail="Source organization not found")
    
    # Get target organization details
    target_org = get_organization_by_id(contract_data.target_org_id)
    if not target_org:
        raise HTTPException(status_code=404, detail="Target organization not found")
    
    # Check if contract already exists
    existing_contract = inter_org_contracts_collection.find_one({
        "$or": [
            {"source_org_id": source_org_id, "target_org_id": contract_data.target_org_id},
            {"source_org_id": contract_data.target_org_id, "target_org_id": source_org_id}
        ],
        "status": "active"
    })
    
    if existing_contract:
        raise HTTPException(status_code=400, detail="Active contract already exists between these organizations")
    
    # Create contract
    contract_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    retention_days = int(contract_data.retention_window.split()[0])
    expires_at = created_at + timedelta(days=retention_days)
    
    # Generate signature
    signature_data = f"{source_org_id}:{contract_data.target_org_id}:{contract_data.contract_type}:{created_at.isoformat()}"
    import hashlib
    signature = hashlib.sha256(signature_data.encode()).hexdigest()
    
    contract = InterOrgContract(
        contract_id=contract_id,
        source_org_id=source_org_id,
        source_org_name=source_org["org_name"],
        target_org_id=contract_data.target_org_id,
        target_org_name=target_org["org_name"],
        contract_type=contract_data.contract_type,
        allowed_resources=contract_data.allowed_resources,
        purposes=contract_data.purposes,
        retention_window=contract_data.retention_window,
        data_flow_direction=contract_data.data_flow_direction,
        created_at=created_at,
        expires_at=expires_at,
        signature=signature
    )
    
    # Insert into database
    result = inter_org_contracts_collection.insert_one(contract.model_dump(by_alias=True))
    
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
    
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": target_org["org_name"],
        "resource_name": "Inter-Org Contract",
        "purpose": contract_data.purposes,
        "log_type": "contract_created",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": created_at,
        "contract_id": contract_id
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "Inter-organization contract created successfully",
        "contract_id": contract_id,
        "contract": contract.model_dump()
    }

@router.get("/organization/{org_id}")
async def get_organization_contracts(
    org_id: str, 
    current_user: TokenData = Depends(get_current_user)
):
    """Get all contracts for an organization"""
    
    # Verify user is admin of this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get contracts where this org is source or target
    contracts = list(inter_org_contracts_collection.find({
        "$or": [
            {"source_org_id": org_id},
            {"target_org_id": org_id}
        ]
    }, sort=[("created_at", -1)]))
    
    # Convert ObjectId to string and format dates
    for contract in contracts:
        contract["_id"] = str(contract["_id"])
        contract["created_at"] = contract["created_at"].isoformat()
        contract["expires_at"] = contract["expires_at"].isoformat()
    
    return jsonable_encoder(contracts)

@router.get("/org/{org_id}")
async def get_organization_contracts(org_id: str):
    """Get all inter-organization contracts for an organization"""
    # Get contracts where this org is the source
    source_contracts = list(inter_org_contracts_collection.find({
        "source_org_id": org_id
    }))
    
    # Get contracts where this org is the target
    target_contracts = list(inter_org_contracts_collection.find({
        "target_org_id": org_id
    }))
    
    # Combine and format
    all_contracts = source_contracts + target_contracts
    
    # Sort by created_at (newest first)
    all_contracts.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    
    # Format response
    formatted_contracts = []
    for contract in all_contracts:
        formatted_contracts.append({
            "contract_id": contract["contract_id"],
            "source_org_id": contract["source_org_id"],
            "source_org_name": contract["source_org_name"],
            "target_org_id": contract["target_org_id"],
            "target_org_name": contract["target_org_name"],
            "contract_type": contract["contract_type"],
            "allowed_resources": contract["allowed_resources"],
            "purposes": contract["purposes"],
            "retention_window": contract["retention_window"],
            "data_flow_direction": contract["data_flow_direction"],
            "created_at": contract["created_at"].isoformat(),
            "expires_at": contract["expires_at"].isoformat(),
            "status": contract["status"],
            "signature": contract["signature"]
        })
    
    return formatted_contracts

@router.get("/{contract_id}")
async def get_contract_details(
    contract_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Get detailed information about a specific contract"""
    
    contract = inter_org_contracts_collection.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user has access to this contract
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user_org_id = user.get("organization_id")
    if contract["source_org_id"] != user_org_id and contract["target_org_id"] != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Convert ObjectId to string and format dates
    contract["_id"] = str(contract["_id"])
    contract["created_at"] = contract["created_at"].isoformat()
    contract["expires_at"] = contract["expires_at"].isoformat()
    
    return jsonable_encoder(contract)

@router.put("/{contract_id}/terminate")
async def terminate_contract(
    contract_id: str,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Terminate an inter-organization contract"""
    
    # Get the contract
    contract = inter_org_contracts_collection.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Verify user can terminate this contract
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can terminate contracts")
    
    user_org_id = user.get("organization_id")
    if contract["source_org_id"] != user_org_id and contract["target_org_id"] != user_org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if contract is already terminated
    if contract["status"] == "terminated":
        raise HTTPException(status_code=400, detail="Contract is already terminated")
    
    # Update contract status
    inter_org_contracts_collection.update_one(
        {"contract_id": contract_id},
        {"$set": {"status": "terminated"}}
    )
    
    # Log the termination
    client_ip = "unknown"
    if http_request:
        forwarded_for = http_request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif http_request.headers.get("X-Real-IP"):
            client_ip = http_request.headers.get("X-Real-IP")
        elif http_request.client:
            client_ip = http_request.client.host
    
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": contract["target_org_name"] if contract["source_org_id"] == user_org_id else contract["source_org_name"],
        "resource_name": "Inter-Org Contract",
        "purpose": ["Contract Termination"],
        "log_type": "contract_terminated",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "contract_id": contract_id
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "Contract terminated successfully",
        "contract_id": contract_id
    }

@router.get("/available-organizations")
async def get_available_organizations(current_user: TokenData = Depends(get_current_user)):
    """Get list of organizations available for contract creation"""
    
    # Verify user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can view available organizations")
    
    user_org_id = user.get("organization_id")
    
    # Get all organizations except the current user's organization
    organizations = list(organizations_collection.find(
        {"org_id": {"$ne": user_org_id}},
        {"org_id": 1, "org_name": 1, "contract_id": 1}
    ))
    
    return jsonable_encoder(organizations)

@router.get("/stats/{org_id}")
async def get_contract_stats(org_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get statistics about contracts for an organization"""
    
    # Verify user is admin of this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count contracts by status
    stats = {
        "total_contracts": inter_org_contracts_collection.count_documents({
            "$or": [{"source_org_id": org_id}, {"target_org_id": org_id}]
        }),
        "active_contracts": inter_org_contracts_collection.count_documents({
            "$or": [{"source_org_id": org_id}, {"target_org_id": org_id}],
            "status": "active"
        }),
        "expired_contracts": inter_org_contracts_collection.count_documents({
            "$or": [{"source_org_id": org_id}, {"target_org_id": org_id}],
            "status": "expired"
        }),
        "terminated_contracts": inter_org_contracts_collection.count_documents({
            "$or": [{"source_org_id": org_id}, {"target_org_id": org_id}],
            "status": "terminated"
        })
    }
    
    return stats 