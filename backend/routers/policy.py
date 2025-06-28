import os
import json
from fastapi import APIRouter, HTTPException
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
def create_policy(data: UserInputPII):
    pii_value = data.pii_value.strip()
    resource = data.resource.strip().lower()

    if resource not in TOKENIZER_MAP:
        raise HTTPException(status_code=400, detail=f"Unsupported resource type: {resource}")

    matched = next((r for r in contract["resources_allowed"] if r["resource_name"] == resource), None)
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
        "shared_with": contract["organization_name"],
        "contract_id": contract["contract_id"],
        "retention_window": matched["retention_window"],
        "created_at": created_at,
        "expiry": expiry
    }

    signature_payload = json.dumps(
        {k: str(v) if isinstance(v, datetime) else v for k, v in policy_data.items()},
        sort_keys=True
    )
    policy_data["signature"] = generate_policy_signature(signature_payload)

    result = policies_collection.insert_one(policy_data)
    policy_data["_id"] = str(result.inserted_id)  # ✅ convert ObjectId to str

    return jsonable_encoder(policy_data)  # now safe to encode
