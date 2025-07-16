import os
import json
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from datetime import datetime, timedelta
from fastapi.encoders import jsonable_encoder
from pymongo import MongoClient
from dotenv import load_dotenv
from models import PIIInput, UserInputPII
from helpers import users_collection, user_pii_collection,decrypt_pii
from routers.pii_tokenizer import (
    tokenize_aadhaar, tokenize_pan, tokenize_account, tokenize_ifsc,
    tokenize_creditcard, tokenize_debitcard, tokenize_gst,
    tokenize_itform16, tokenize_upi, tokenize_passport, tokenize_dl
)
from routers.auth import generate_otp, send_email_otp
from routers.policy import create_policy_internal
from routers.websocket import send_user_update
import uuid
from pydantic import BaseModel, EmailStr

load_dotenv()

router = APIRouter(prefix="/insurance", tags=["Insurance Consent"])

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_database("PedolOne")
policies_collection = db.get_collection("policy")

with open("routers/contract_insurance.json") as f:
    contract = json.load(f)

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

# In-memory session store (for demo; use Redis/DB in prod)
sessions = {}

class InsuranceConsentRequest(BaseModel):
    email: EmailStr
    aadhaar: str = None
    pan: str = None
    passport: str = None
    drivinglicense: str = None
    consent: bool

class InsuranceVerifyOtpRequest(BaseModel):
    session_id: str
    otp: str

class InsuranceResendOtpRequest(BaseModel):
    session_id: str
    email: EmailStr

@router.post("/consent")
def insurance_consent(data: InsuranceConsentRequest, background_tasks: BackgroundTasks):
    if not data.consent:
        raise HTTPException(status_code=400, detail="Consent not given")
    
    # Verify email exists in users collection
    user = users_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found. Please register with PedolOne first.")
    
    user_id = user["userid"]
    
    # Prepare list of PII to check
    pii_inputs = []
    if data.aadhaar:
        pii_inputs.append(("aadhaar", data.aadhaar))
    if data.pan:
        pii_inputs.append(("pan", data.pan))
    if data.passport:
        pii_inputs.append(("passport", data.passport))
    if data.drivinglicense:
        pii_inputs.append(("drivinglicense", data.drivinglicense))
    if not pii_inputs:
        raise HTTPException(status_code=400, detail="No PII provided")
    
    # Match all PII
    pii_doc = user_pii_collection.find_one({"user_id": user_id})
    if not pii_doc:
        raise HTTPException(status_code=404, detail="No PII records found for this user")
    
    matched_pii = []
    for resource, value in pii_inputs:
        tokenizer = TOKENIZER_MAP.get(resource)
        if not tokenizer:
            raise HTTPException(status_code=400, detail=f"Unsupported resource type: {resource}")
        
        token = tokenizer(PIIInput(pii_value=value))["token"]
        entry = next((entry for entry in pii_doc.get("pii", []) if entry["resource"] == resource and entry["token"] == token), None)
        if not entry:
            raise HTTPException(status_code=404, detail=f"{resource} does not match records")
        matched_pii.append({"resource": resource, "token": token, "original": entry["original"]})
    
    # All PII matched, generate OTP
    otp = generate_otp()
    session_id = str(uuid.uuid4())
    
    # Store session with expiry
    sessions[session_id] = {
        "user_id": user_id,
        "pii": matched_pii,
        "email": data.email,
        "otp": otp,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }
    
    # Send OTP
    background_tasks.add_task(send_email_otp, data.email, otp)
    
    return {"session_id": session_id, "message": "OTP sent to email"}

@router.post("/verify-otp")
async def insurance_verify_otp(data: InsuranceVerifyOtpRequest, request: Request):
    session = sessions.get(data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if datetime.utcnow() > session["expires_at"]:
        del sessions[data.session_id]
        raise HTTPException(status_code=400, detail="Session expired. Please try again.")
    
    if session["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Create policies for matched PII
    created_policies = []
    for pii in session["pii"]:
        try:
            pii_value = decrypt_pii(pii["original"])
        except Exception:
            pii_value = pii["original"]
        
        # Get client IP
        client_ip = "unknown"
        if request:
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                client_ip = forwarded_for.split(",")[0].strip()
            elif request.headers.get("X-Real-IP"):
                client_ip = request.headers.get("X-Real-IP")
            elif request.client:
                client_ip = request.client.host
        
        policy_input = UserInputPII(pii_value=pii_value, resource=pii["resource"])
        policy_result = create_policy_internal(policy_input, user_id=session["user_id"], ip_address=client_ip, contract_override=contract)
        created_policies.append(policy_result)
        
        # Send WebSocket update for each created policy
        await send_user_update(
            user_id=str(session["user_id"]),
            update_type="policy_created",
            data={"policy": policy_result}
        )
    
    # Cleanup session
    del sessions[data.session_id]
    
    return jsonable_encoder({
        "message": "Consent and policy creation successful",
        "policies": created_policies
    })

@router.post("/resend-otp")
def insurance_resend_otp(data: InsuranceResendOtpRequest, background_tasks: BackgroundTasks):
    session = sessions.get(data.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if session["email"] != data.email:
        raise HTTPException(status_code=400, detail="Email mismatch")
    
    # Generate new OTP
    new_otp = generate_otp()
    
    # Update session
    session["otp"] = new_otp
    session["created_at"] = datetime.utcnow()
    session["expires_at"] = datetime.utcnow() + timedelta(minutes=10)
    
    # Send new OTP
    background_tasks.add_task(send_email_otp, data.email, new_otp)
    
    return {"message": "New OTP sent to email"} 