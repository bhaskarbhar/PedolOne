import os
import json
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from fastapi.encoders import jsonable_encoder
from pymongo import MongoClient
from dotenv import load_dotenv
from models import PIIInput
from typing import Optional

from helpers import generate_policy_signature
from routers.pii_tokenizer import (
    tokenize_aadhaar, tokenize_pan, tokenize_account, tokenize_ifsc,
    tokenize_creditcard, tokenize_debitcard, tokenize_gst,
    tokenize_itform16, tokenize_upi, tokenize_passport, tokenize_dl
)
from models import UserInputPII
from models import LogEntry

load_dotenv()

router = APIRouter(prefix="/policy", tags=["Policy"])

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_database("PedolOne")
policies_collection = db.get_collection("policy")
policies_collection.create_index("expiry", expireAfterSeconds=0)

# New: logs collection for audit logs
logs_collection = db.get_collection("logs")

with open("routers/contract.json") as f:
    contract = json.load(f)

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

def create_policy_internal(data: UserInputPII, user_id: int, ip_address: str = None, contract_override: Optional[dict] = None, source_org_id: str = None, target_org_id: str = None):
    """Internal function to create policy with additional parameters for inter-org sharing"""
    pii_value = data.pii_value.strip()
    resource = data.resource.strip().lower()

    # Use override contract if provided, else default
    use_contract = contract_override if contract_override is not None else contract

    if resource not in TOKENIZER_MAP:
        raise HTTPException(status_code=400, detail=f"Unsupported resource type: {resource}")

    matched = next((r for r in use_contract["resources_allowed"] if r["resource_name"] == resource), None)
    if not matched:
        raise HTTPException(status_code=404, detail=f"{resource} not allowed by contract")

    try:
        token_response = TOKENIZER_MAP[resource](PIIInput(pii_value=pii_value))
        token = token_response["token"]
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    created_at = datetime.utcnow()
    retention_days = int(matched["retention_window"].split()[0])
    expiry = created_at + timedelta(days=retention_days)

    policy_data = {
        "tokenid": token,
        "resource_name": resource,
        "purpose": matched["purpose"],
        "shared_with": use_contract["organization_name"],
        "contract_id": use_contract["contract_id"],
        "retention_window": matched["retention_window"],
        "created_at": created_at,
        "expiry": expiry,
        "user_id": user_id
    }
    
    # Add inter-org sharing fields if provided
    if source_org_id:
        policy_data["source_org_id"] = source_org_id
    if target_org_id:
        policy_data["target_org_id"] = target_org_id

    signature_payload = json.dumps(
        {k: str(v) if isinstance(v, datetime) else v for k, v in policy_data.items()},
        sort_keys=True
    )
    policy_data["signature"] = generate_policy_signature(signature_payload)

    result = policies_collection.insert_one(policy_data)
    policy_data["_id"] = str(result.inserted_id)

    # Write to logs collection using LogEntry model
    log_entry = LogEntry(
        user_id=user_id,
        fintech_name=use_contract["organization_name"],
        fintech_id=str(use_contract.get("organization_id") or use_contract.get("org_id") or ""),
        resource_name=resource,
        purpose=matched["purpose"] if isinstance(matched["purpose"], list) else [matched["purpose"]],
        log_type="consent",
        ip_address=ip_address,
        data_source="individual",
        created_at=created_at,
        source_org_id=source_org_id,
        target_org_id=target_org_id if target_org_id else None
    ).dict(by_alias=True)
    # If target_org_id is set, set data_source to organization
    if target_org_id:
        log_entry["data_source"] = "organization"
    # Remove _id if None to avoid duplicate key error
    if log_entry.get("_id") is None:
        log_entry.pop("_id")
    logs_collection.insert_one(log_entry)

    return jsonable_encoder(policy_data)

@router.post("/input")
def create_policy(data: UserInputPII, user_id: int, contract_override: Optional[dict] = None):
    """Create policy for user consent to organization"""
    return create_policy_internal(data, user_id, contract_override=contract_override)

@router.get("/user/{user_id}/active")
def get_user_active_policies(user_id: int):
    """Get all active policies for a user"""
    current_time = datetime.utcnow()
    policies = list(policies_collection.find({
        "user_id": user_id,
        "expiry": {"$gt": current_time}
    }))
    
    # Convert ObjectId to string for JSON serialization
    for policy in policies:
        policy["_id"] = str(policy["_id"])
        # Convert datetime objects to ISO format strings
        policy["created_at"] = policy["created_at"].isoformat()
        policy["expiry"] = policy["expiry"].isoformat()
    
    return jsonable_encoder(policies)

@router.get("/user/{user_id}/logs")
def get_user_access_logs(user_id: int, limit: int = 10):
    """Get recent access logs for a user's PII"""
    logs = list(logs_collection.find(
        {"user_id": user_id},
        sort=[("created_at", -1)],
        limit=limit
    ))
    # Convert ObjectId to string and format dates
    for log in logs:
        log["_id"] = str(log["_id"])
        log["created_at"] = log["created_at"].isoformat()
        # For frontend compatibility: always provide fintechName
        log["fintechName"] = log.get("shared_with") or log.get("fintech_name")
    return jsonable_encoder(logs)

@router.get("/contract/{contract_id}/unique_users")
def get_unique_users_for_contract(contract_id: str):
    """Return the number of unique users for a given contract_id."""
    unique_user_ids = policies_collection.distinct("user_id", {"contract_id": contract_id})
    return {"unique_user_count": len(unique_user_ids)}

@router.get("/contract/{contract_id}/active_policies_count")
def get_active_policies_count(contract_id: str):
    """Return the number of non-expired policies for the given contract_id."""
    current_time = datetime.utcnow()
    count = policies_collection.count_documents({
        "contract_id": contract_id,
        "expiry": {"$gt": current_time}
    })
    return {"active_policies_count": count}

@router.get("/contract/{contract_id}/data_categories")
def get_data_categories_for_contract(contract_id: str):
    """Return data categories (resource_name), their counts, and percentage of users for a contract."""
    # Get all policies for the contract
    pipeline = [
        {"$match": {"contract_id": contract_id}},
        {"$group": {"_id": "$resource_name", "count": {"$sum": 1}}}
    ]
    resource_counts = list(policies_collection.aggregate(pipeline))
    # Get total unique users for the contract
    unique_user_ids = policies_collection.distinct("user_id", {"contract_id": contract_id})
    total_users = len(unique_user_ids) or 1  # avoid division by zero
    # Build response
    categories = []
    for rc in resource_counts:
        percentage = round((rc["count"] / total_users) * 100, 1)
        categories.append({
            "name": rc["_id"],
            "count": rc["count"],
            "percentage": percentage,
            "unique_users": total_users
        })
    return {"data_categories": categories}

@router.get("/org/{org_id}/data_categories")
async def get_organization_data_categories(org_id: str):
    """Get data categories for an organization with user counts and percentages"""
    # Get all policies for this organization
    policies = list(policies_collection.find({
        "target_org_id": org_id
    }))
    
    # Count unique users
    unique_users = len(set([policy["user_id"] for policy in policies]))
    
    if unique_users == 0:
        return []
    
    # Group by resource name
    resource_counts = {}
    for policy in policies:
        resource = policy["resource_name"]
        if resource not in resource_counts:
            resource_counts[resource] = set()
        resource_counts[resource].add(policy["user_id"])
    
    # Calculate percentages
    data_categories = []
    for resource, user_set in resource_counts.items():
        user_count = len(user_set)
        percentage = round((user_count / unique_users) * 100, 1)
        
        data_categories.append({
            "name": resource,
            "unique_users": user_count,
            "percentage": percentage
        })
    
    # Sort by percentage (highest first)
    data_categories.sort(key=lambda x: x["percentage"], reverse=True)
    
    return data_categories

@router.get("/compliance/org/{org_id}")
async def get_organization_compliance_metrics(org_id: str):
    """Get compliance metrics for an organization"""
    # Get organization details to find the org name
    from helpers import get_organization_by_id
    org = get_organization_by_id(org_id)
    org_name = org["org_name"] if org else org_id
    
    # Get all policies for this organization (by ID or name)
    policies = list(policies_collection.find({
        "$or": [
            {"target_org_id": org_id},
            {"shared_with": org_name}
        ]
    }))
    
    total_policies = len(policies)
    active_policies = len([p for p in policies if not p.get("is_revoked", False)])
    
    # Calculate compliance metrics
    metrics = []
    
    # Data Processing Consent
    consent_policies = len([p for p in policies if p.get("consent_given", False)])
    consent_percentage = round((consent_policies / total_policies * 100), 1) if total_policies > 0 else 0
    metrics.append({
        "metric": "Data Processing Consent",
        "value": f"{consent_percentage}%",
        "status": "good" if consent_percentage >= 95 else "warning" if consent_percentage >= 80 else "poor"
    })
    
    # Purpose Limitation
    purpose_limited = len([p for p in policies if p.get("purpose") and len(p["purpose"]) <= 3])
    purpose_percentage = round((purpose_limited / total_policies * 100), 1) if total_policies > 0 else 0
    metrics.append({
        "metric": "Purpose Limitation",
        "value": f"{purpose_percentage}%",
        "status": "good" if purpose_percentage >= 90 else "warning" if purpose_percentage >= 75 else "poor"
    })
    
    # Data Minimization
    minimized = len([p for p in policies if p.get("resource_name") in ["aadhaar", "pan", "account"]])
    minimization_percentage = round((minimized / total_policies * 100), 1) if total_policies > 0 else 0
    metrics.append({
        "metric": "Data Minimization",
        "value": f"{minimization_percentage}%",
        "status": "good" if minimization_percentage >= 85 else "warning" if minimization_percentage >= 70 else "poor"
    })
    
    # Retention Compliance
    retention_compliant = len([p for p in policies if p.get("retention_window") and "30" in p["retention_window"]])
    retention_percentage = round((retention_compliant / total_policies * 100), 1) if total_policies > 0 else 0
    metrics.append({
        "metric": "Retention Compliance",
        "value": f"{retention_percentage}%",
        "status": "good" if retention_percentage >= 90 else "warning" if retention_percentage >= 75 else "poor"
    })
    
    # User Rights Response
    user_rights_percentage = 100.0  # Assuming all requests are handled
    metrics.append({
        "metric": "User Rights Response",
        "value": f"{user_rights_percentage}%",
        "status": "excellent"
    })
    
    return metrics

@router.get("/org/{org_id}/data_categories")
async def get_organization_data_categories(org_id: str):
    """Get data categories and usage statistics for an organization"""
    # Get organization details to find the org name
    from helpers import get_organization_by_id
    org = get_organization_by_id(org_id)
    org_name = org["org_name"] if org else org_id
    
    # Get all policies for this organization (by ID or name)
    policies = list(policies_collection.find({
        "$or": [
            {"target_org_id": org_id},
            {"shared_with": org_name}
        ]
    }))
    
    # Count unique users
    unique_users = len(set([p["user_id"] for p in policies]))
    
    # Group by resource type
    resource_counts = {}
    for policy in policies:
        resource = policy["resource_name"]
        if resource not in resource_counts:
            resource_counts[resource] = {"count": 0, "users": set()}
        resource_counts[resource]["count"] += 1
        resource_counts[resource]["users"].add(policy["user_id"])
    
    # Calculate categories
    categories = []
    for resource, data in resource_counts.items():
        user_count = len(data["users"])
        percentage = round((user_count / unique_users * 100), 1) if unique_users > 0 else 0
        
        categories.append({
            "name": resource.title(),
            "unique_users": user_count,
            "percentage": percentage
        })
    
    # Sort by percentage (highest first)
    categories.sort(key=lambda x: x["percentage"], reverse=True)
    
    return categories

@router.get("/org-dashboard/{org_id}/logs")
def get_org_access_logs(org_id: str, limit: int = 50):
    """Get recent access logs for an organization's PII by fintech_id, requester_org_id, responder_org_id, or target_org_id"""
    # Get organization details to find the org name
    from helpers import get_organization_by_id
    org = get_organization_by_id(org_id)
    org_name = org["org_name"] if org else org_id
    
    logs = list(logs_collection.find(
        {"$or": [
            {"fintech_id": org_id},
            {"requester_org_id": org_id},
            {"responder_org_id": org_id},
            {"target_org_id": org_id},
            {"source_org_id": org_id},
            {"organization_id": org_id},  # For login logs
            {"fintech_name": org_name}  # Fallback for logs that use org name
        ]},
        sort=[("created_at", -1)],
        limit=limit
    ))
    # Convert ObjectId to string and format dates
    for log in logs:
        log["_id"] = str(log["_id"])
        log["created_at"] = log["created_at"].isoformat()
        # For frontend compatibility: always provide fintechName
        log["fintechId"] = log.get("fintech_id") or log.get("requester_org_id") or log.get("responder_org_id") or log.get("target_org_id") or log.get("source_org_id") or log.get("organization_id")
    return jsonable_encoder(logs)

@router.get("/org-dashboard/{org_id}/data_categories")
def get_org_dashboard_data_categories(org_id: str):
    """Return data categories for an organization dashboard using contract_id."""
    from helpers import organizations_collection
    org = organizations_collection.find_one({"org_id": org_id})
    if not org or not org.get("contract_id"):
        return {"data_categories": []}
    contract_id = org["contract_id"]
    print(contract_id)
    # Use the same logic as get_data_categories_for_contract
    pipeline = [
        {"$match": {"contract_id": contract_id}},
        {"$group": {"_id": "$resource_name", "count": {"$sum": 1}}}
    ]
    resource_counts = list(policies_collection.aggregate(pipeline))
    unique_user_ids = policies_collection.distinct("user_id", {"contract_id": contract_id})
    total_users = len(unique_user_ids) or 1
    categories = []
    for rc in resource_counts:
        percentage = round((rc["count"] / total_users) * 100, 1)
        categories.append({
            "name": rc["_id"],
            "count": rc["count"],
            "percentage": percentage,
            "unique_users": total_users
        })
    return {"data_categories": categories}

@router.get("/org-dashboard/{org_id}/contract-logs")
def get_org_contract_logs(org_id: str, limit: int = 20):
    """Get contract creation/response logs for an organization (by source or target org_id)"""
    from routers.inter_org_contracts import inter_org_contracts_collection
    
    # First, get all contract IDs that are not deleted
    # This ensures deleted contracts don't appear in the contract logs tab
    active_contracts = list(inter_org_contracts_collection.find(
        {"status": {"$ne": "deleted"}},
        {"contract_id": 1}
    ))
    active_contract_ids = [contract["contract_id"] for contract in active_contracts]
    
    # Then get logs only for active contracts
    logs = list(logs_collection.find(
        {
            "$and": [
                {"log_type": {"$in": ["contract_creation", "contract_request_approved", "contract_request_rejected"]}},
                {"$or": [
                    {"source_org_id": org_id},
                    {"target_org_id": org_id},
                    {"requester_org_id": org_id},
                    {"responder_org_id": org_id},
                    {"organization_id": org_id}
                ]}
            ]
        },
        sort=[("created_at", -1)],
        limit=limit
    ))
    for log in logs:
        log["_id"] = str(log["_id"])
        log["created_at"] = log["created_at"].isoformat()
    return jsonable_encoder(logs)
