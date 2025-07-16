import json
from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime
from fastapi.encoders import jsonable_encoder
from typing import List
from pydantic import BaseModel

from helpers import (
    organizations_collection, users_collection, user_pii_collection, 
    policies_collection, logs_collection, get_organization_by_id,
    get_organization_clients, encrypt_pii, decrypt_pii
)
from routers.auth import get_current_user
from routers.policy import create_policy_internal
from routers.pii_tokenizer import (
    tokenize_aadhaar, tokenize_pan, tokenize_account, tokenize_ifsc,
    tokenize_creditcard, tokenize_debitcard, tokenize_gst,
    tokenize_itform16, tokenize_upi, tokenize_passport, tokenize_dl
)

router = APIRouter(prefix="/organization", tags=["Organization Management"])

# Map resource to tokenizer function
TOKENIZER_MAP = {
    "aadhaar": tokenize_aadhaar,
    "pan": tokenize_pan,
    "account": tokenize_account,
    "ifsc": tokenize_ifsc,
    "creditcard": tokenize_creditcard,
    "debitcard": tokenize_debitcard,
    "gst": tokenize_gst,
    "itform16": tokenize_itform16,
    "upi": tokenize_upi,
    "passport": tokenize_passport,
    "drivinglicense": tokenize_dl
}

class DataShareRequest(BaseModel):
    target_org_id: str
    user_id: int
    resources: List[str]
    purpose: List[str]

class InterOrgDataShareRequest(BaseModel):
    target_org_id: str
    user_id: int
    resources: List[str]
    purpose: List[str]

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"

@router.get("/list")
async def get_organizations():
    """Get list of all organizations"""
    organizations = []
    for org in organizations_collection.find():
        organizations.append({
            "org_id": org["org_id"],
            "org_name": org["org_name"],
            "contract_id": org["contract_id"],
            "created_at": org["created_at"].isoformat()
        })
    
    return {"organizations": organizations}

@router.get("/{org_id}/clients")
async def get_organization_clients_endpoint(org_id: str, current_user: dict = Depends(get_current_user)):
    """Get all clients (users who have shared data) for an organization"""
    # Verify user is an organization admin
    if current_user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can access this endpoint")
    
    # Verify organization exists
    org = get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Get clients through policies
    clients = get_organization_clients(org_id)
    
    return {"clients": clients}

@router.get("/{org_id}/clients/{user_id}/pii")
async def get_client_pii(org_id: str, user_id: int, current_user: dict = Depends(get_current_user)):
    """Get PII data for a specific client"""
    # Verify user is an organization admin
    if current_user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can access this endpoint")
    
    # Verify organization exists
    org = get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify user has shared data with this org (has policies)
    user_policies = list(policies_collection.find({
        "user_id": user_id,
        "target_org_id": org_id
    }))
    
    if not user_policies:
        raise HTTPException(status_code=404, detail="User has not shared data with this organization")
    
    # Get user's PII data
    user_pii_doc = user_pii_collection.find_one({"user_id": user_id})
    if not user_pii_doc:
        return {"pii": []}
    
    # Filter PII by resources that user has policies for
    policy_resources = set([policy["resource_name"] for policy in user_policies])
    accessible_pii = [
        pii for pii in user_pii_doc.get("pii", [])
        if pii["resource"] in policy_resources
    ]
    
    # Format response (don't return encrypted data)
    pii_data = []
    for pii in accessible_pii:
        pii_data.append({
            "resource": pii["resource"],
            "token": pii["token"],
            "created_at": pii["created_at"].isoformat()
        })
    
    return {"pii": pii_data}

@router.post("/{org_id}/share-data")
async def share_data_with_organization(
    org_id: str, 
    request: DataShareRequest, 
    current_user: dict = Depends(get_current_user),
    http_request: Request = None
):
    """Share user data with another organization (inter-organization sharing)"""
    # Verify user is an organization admin
    if current_user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can share data")
    
    # Verify source organization exists
    source_org = get_organization_by_id(org_id)
    if not source_org:
        raise HTTPException(status_code=404, detail="Source organization not found")
    
    # Verify target organization exists
    target_org = get_organization_by_id(request.target_org_id)
    if not target_org:
        raise HTTPException(status_code=404, detail="Target organization not found")
    
    # Verify user exists
    user = users_collection.find_one({"userid": request.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify source org has access to user's data
    source_policies = list(policies_collection.find({
        "user_id": request.user_id,
        "target_org_id": org_id
    }))
    
    if not source_policies:
        raise HTTPException(status_code=403, detail="Source organization does not have access to this user's data")
    
    # Get user's PII data
    user_pii_doc = user_pii_collection.find_one({"user_id": request.user_id})
    if not user_pii_doc:
        raise HTTPException(status_code=404, detail="No PII data found for this user")
    
    # Load target organization's contract
    # Map contract_id to filename
    contract_id_to_file = {
        "contract_stockbroker_2025": "routers/contract_stockbroker.json",
        "contract_bankabc_2025": "routers/contract_bankabc.json", 
        "contract_insurance_2025": "routers/contract_insurance.json"
    }
    
    contract_file = contract_id_to_file.get(target_org['contract_id'])
    if not contract_file:
        raise HTTPException(status_code=404, detail=f"Contract mapping not found for {target_org['contract_id']}")
    
    try:
        with open(contract_file) as f:
            contract = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Contract file not found: {contract_file}")
    
    # Filter PII by requested resources and available data
    available_pii = [
        pii for pii in user_pii_doc.get("pii", [])
        if pii["resource"] in request.resources
    ]
    
    if not available_pii:
        raise HTTPException(status_code=404, detail="No PII data found for requested resources")
    
    # Create policies for each resource
    created_policies = []
    client_ip = get_client_ip(http_request) if http_request else "unknown"
    
    for pii in available_pii:
        # Find matching contract resource
        contract_resource = next(
            (r for r in contract["resources_allowed"] if r["resource_name"] == pii["resource"]), 
            None
        )
        
        if not contract_resource:
            continue  # Skip if resource not allowed by contract
        
        # Decrypt PII for policy creation
        decrypted_pii = decrypt_pii(pii["original"])
        
        # Create policy for inter-org sharing
        from models import UserInputPII
        policy_input = UserInputPII(pii_value=decrypted_pii, resource=pii["resource"])
        policy_result = create_policy_internal(
            policy_input, 
            user_id=request.user_id,
            ip_address=client_ip,
            contract_override=contract,
            source_org_id=org_id,
            target_org_id=request.target_org_id
        )
        
        created_policies.append(policy_result)
        
        # Log inter-org data sharing
        log_entry = {
            "user_id": request.user_id,
            "fintech_name": target_org["org_name"],
            "resource_name": pii["resource"],
            "purpose": request.purpose,
            "log_type": "data_access",
            "ip_address": client_ip,
            "data_source": "organization",
            "source_org_id": org_id,
            "target_org_id": request.target_org_id,
            "created_at": datetime.utcnow()
        }
        logs_collection.insert_one(log_entry)
    
    return {
        "message": f"Data shared successfully with {target_org['org_name']}",
        "policies_created": len(created_policies),
        "policies": created_policies
    }

@router.get("/{org_id}/data-requests")
async def get_data_requests(org_id: str, current_user: dict = Depends(get_current_user)):
    """Get data requests received by this organization"""
    # Verify user is an organization admin
    if current_user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can access this endpoint")
    
    # Verify organization exists
    org = get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Get policies where this org is the target (data shared with them)
    policies = list(policies_collection.find({"target_org_id": org_id}))
    
    # Group by source organization
    requests_by_source = {}
    for policy in policies:
        source_org_id = policy.get("source_org_id")
        if source_org_id and source_org_id != org_id:  # Only inter-org requests
            if source_org_id not in requests_by_source:
                source_org = get_organization_by_id(source_org_id)
                requests_by_source[source_org_id] = {
                    "source_org_name": source_org["org_name"] if source_org else "Unknown",
                    "requests": []
                }
            
            requests_by_source[source_org_id]["requests"].append({
                "user_id": policy["user_id"],
                "resource_name": policy["resource_name"],
                "purpose": policy["purpose"],
                "created_at": policy["created_at"].isoformat(),
                "expiry": policy["expiry"].isoformat()
            })
    
    return {"data_requests": requests_by_source} 

@router.get("/{org_id}")
async def get_organization(org_id: str):
    """Get organization details by ID"""
    org = get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {
        "org_id": org["org_id"],
        "org_name": org["org_name"],
        "contract_id": org["contract_id"],
        "created_at": org["created_at"].isoformat()
    }

@router.get("/{org_id}/users")
async def get_organization_users(org_id: str):
    """Get all users managed by an organization"""
    # Get organization details to find the org name
    org = get_organization_by_id(org_id)
    org_name = org["org_name"] if org else org_id
    
    # Get users who have policies with this organization (by ID or name)
    user_policies = list(policies_collection.find({
        "$or": [
            {"target_org_id": org_id},
            {"shared_with": org_name}
        ]
    }))
    
    # Get unique user IDs
    user_ids = list(set([policy["user_id"] for policy in user_policies]))
    
    # Get user details
    users = []
    for user_id in user_ids:
        user = users_collection.find_one({"userid": user_id})
        if user:
            # Get user's shared resources
            user_policies_for_org = [p for p in user_policies if p["user_id"] == user_id]
            shared_resources = list(set([p["resource_name"] for p in user_policies_for_org]))
            
            # Get active policies count
            active_policies = len([p for p in user_policies_for_org if not p.get("is_revoked", False)])
            
            # Get last consent date
            last_consent = None
            if user_policies_for_org:
                latest_policy = max(user_policies_for_org, key=lambda x: x.get("created_at", datetime.min))
                last_consent = latest_policy.get("created_at")
            
            # Get total data access count from audit logs
            data_access_count = logs_collection.count_documents({
                "user_id": user_id,
                "target_org_id": org_id,
                "log_type": "data_access"
            })
            
            users.append({
                "user_id": user["userid"],
                "username": user["username"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone_number": user["phone_number"],
                "shared_resources": shared_resources,
                "active_policies_count": active_policies,
                "last_consent_date": last_consent.isoformat() if last_consent else None,
                "total_data_access_count": data_access_count
            })
    
    return users

@router.get("/list/organizations")
async def get_all_organizations():
    """Get all organizations in the system (for data request targeting)"""
    organizations = []
    for org in organizations_collection.find():
        organizations.append({
            "org_id": org["org_id"],
            "org_name": org["org_name"],
            "contract_id": org["contract_id"]
        })
    
    return {"organizations": organizations}

@router.get("/{org_id}/all-users")
async def get_all_users_by_organization(org_id: str):
    """Get all users that have shared data with a specific organization"""
    # Get organization details
    org = get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org_name = org["org_name"]
    
    # Get users who have policies with this organization (by ID or name)
    user_policies = list(policies_collection.find({
        "$or": [
            {"target_org_id": org_id},
            {"shared_with": org_name}
        ]
    }))
    
    # Get unique user IDs
    user_ids = list(set([policy["user_id"] for policy in user_policies]))
    
    # Get user details
    users = []
    for user_id in user_ids:
        user = users_collection.find_one({"userid": user_id})
        if user:
            users.append({
                "user_id": user["userid"],
                "username": user["username"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone_number": user["phone_number"]
            })
    
    return {"users": users} 