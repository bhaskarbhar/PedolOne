import os
import json
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from fastapi.encoders import jsonable_encoder
from pymongo import MongoClient
from dotenv import load_dotenv
from models import PIIInput

from helpers import generate_policy_signature
from routers.pii_tokenizer import (
    tokenize_aadhaar, tokenize_pan, tokenize_account, tokenize_ifsc,
    tokenize_creditcard, tokenize_debitcard, tokenize_gst,
    tokenize_itform16, tokenize_upi, tokenize_passport, tokenize_dl
)
from models import UserInputPII

load_dotenv()

router = APIRouter(prefix="/policy", tags=["Policy"])

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_database("PedolOne")
policies_collection = db.get_collection("policy")
policies_collection.create_index("expiry", expireAfterSeconds=0)

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

@router.post("/input")
def create_policy(data: UserInputPII, user_id: int = None, contract_override: dict = None):
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
        "expiry": expiry
    }
    if user_id is not None:
        policy_data["user_id"] = user_id

    signature_payload = json.dumps(
        {k: str(v) if isinstance(v, datetime) else v for k, v in policy_data.items()},
        sort_keys=True
    )
    policy_data["signature"] = generate_policy_signature(signature_payload)

    result = policies_collection.insert_one(policy_data)
    policy_data["_id"] = str(result.inserted_id)  # ✅ convert ObjectId to str

    return jsonable_encoder(policy_data)  # now safe to encode

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
    # For now, we'll use policies as access logs
    # In production, you'd want a separate collection for actual access logs
    logs = list(policies_collection.find(
        {"user_id": user_id},
        sort=[("created_at", -1)],
        limit=limit
    ))
    
    # Convert ObjectId to string and format dates
    for log in logs:
        log["_id"] = str(log["_id"])
        log["created_at"] = log["created_at"].isoformat()
        if "expiry" in log:
            log["expiry"] = log["expiry"].isoformat()
    
    return jsonable_encoder(logs)
