import os
import json
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta

from fastapi.encoders import jsonable_encoder
from models import Policy, PIIInput
from routers.pii_tokenizer import tokenize_aadhaar
from helpers import generate_policy_signature
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/policy", tags=["Policy"])

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_database("PedolOne")
policies_collection = db.get_collection("policy")
# Create TTL index for automatic expiry-based deletion (one-time setup)
policies_collection.create_index("expiry", expireAfterSeconds=0)
# Load contract.json
with open("routers/contract.json") as f:
    contract = json.load(f)

@router.post("/aadhaar")
def create_aadhaar_policy(data: PIIInput):
    val = data.pii_value.strip()
    token_response = tokenize_aadhaar(val)
    token = token_response["token"]

    matched = next((r for r in contract["resources_allowed"] if r["resource_name"] == "aadhaar"), None)
    if not matched:
        raise HTTPException(status_code=404, detail="Aadhaar contract not found")

    created_at = datetime.utcnow()
    retention_days = int(matched["retention_window"].split()[0])
    expiry = created_at + timedelta(days=retention_days)

    policy_data = {
        "tokenid": token,
        "resource_name": "aadhaar",
        "purpose": matched["purpose"],
        "shared_with": contract["organization_name"],
        "contract_id": contract["contract_id"],
        "retention_window": matched["retention_window"],
        "created_at": created_at,
        "expiry": expiry
    }

    # Generate signature from serialized data (excluding signature itself)
    signature_payload = json.dumps({k: str(v) if isinstance(v, datetime) else v for k, v in policy_data.items()}, sort_keys=True)
    policy_data["signature"] = generate_policy_signature(signature_payload)

    result = policies_collection.insert_one(policy_data)
    policy_data["_id"] = result.inserted_id

    # Convert to Pydantic model and encode for safe JSON response
    policy_obj = Policy(**policy_data)
    return jsonable_encoder(policy_obj)
