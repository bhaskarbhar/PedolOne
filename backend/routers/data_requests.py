import os
import json
import uuid
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timedelta
from fastapi.encoders import jsonable_encoder
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List, Optional

from models import (
    DataAccessRequest, CreateDataRequest, RespondToRequest,
    InterOrgContract, CreateInterOrgContract
)
from helpers import users_collection, user_pii_collection, policies_collection, logs_collection
from jwt_utils import get_current_user, TokenData
from routers.websocket import send_user_update

load_dotenv()

router = APIRouter(prefix="/data-requests", tags=["Data Access Requests"])

MONGO_URL = os.getenv("MONGO_URL")
client = MongoClient(MONGO_URL)
db = client.get_database("PedolOne")

# Collections
data_requests_collection = db.get_collection("data_requests")
inter_org_contracts_collection = db.get_collection("inter_org_contracts")
organizations_collection = db.get_collection("organizations")

# Create indexes
data_requests_collection.create_index("expires_at", expireAfterSeconds=0)
data_requests_collection.create_index([("target_user_id", 1), ("status", 1)])
data_requests_collection.create_index([("requester_org_id", 1), ("status", 1)])

def get_organization_by_id(org_id: str):
    """Get organization by ID"""
    return organizations_collection.find_one({"org_id": org_id})

def get_user_by_email(email: str):
    """Get user by email"""
    return users_collection.find_one({"email": email})

@router.post("/send-request")
async def send_data_request(
    request_data: CreateDataRequest,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Send a data access request to a user"""
    
    # Verify current user is an organization admin
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization admins can send data requests")
    
    # Get organization details
    org = get_organization_by_id(user.get("organization_id"))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify target user exists
    target_user = get_user_by_email(request_data.target_user_email)
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # Check if user has the requested PII data
    user_pii = user_pii_collection.find_one({"user_id": target_user["userid"]})
    if not user_pii:
        raise HTTPException(status_code=404, detail="User has no PII data")
    
    available_resources = [pii["resource"] for pii in user_pii.get("pii", [])]
    missing_resources = [r for r in request_data.requested_resources if r not in available_resources]
    
    if missing_resources:
        raise HTTPException(
            status_code=400, 
            detail=f"User does not have the following PII types: {', '.join(missing_resources)}"
        )
    
    # Create data request
    request_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(days=7)  # 7 days to respond
    
    data_request = DataAccessRequest(
        request_id=request_id,
        requester_org_id=org["org_id"],
        requester_org_name=org["org_name"],
        target_user_id=target_user["userid"],
        target_user_email=target_user["email"],
        requested_resources=request_data.requested_resources,
        purpose=request_data.purpose,
        retention_window=request_data.retention_window,
        request_message=request_data.request_message,
        created_at=created_at,
        expires_at=expires_at
    )
    
    # Insert into database
    result = data_requests_collection.insert_one(data_request.model_dump(by_alias=True))
    
    # Send WebSocket notification to target user
    await send_user_update(
        user_id=str(target_user["userid"]),
        update_type="data_request_received",
        data={"request": data_request.model_dump()}
    )
    
    # Log the request
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
        "user_id": target_user["userid"],
        "fintech_name": org["org_name"],
        "resource_name": ", ".join(request_data.requested_resources),
        "purpose": request_data.purpose,
        "log_type": "data_request",
        "ip_address": client_ip,
        "data_source": "individual",
        "created_at": created_at,
        "request_id": request_id
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "Data access request sent successfully",
        "request_id": request_id,
        "expires_at": expires_at.isoformat()
    }

@router.get("/received/{user_id}")
async def get_received_requests(user_id: int, current_user: TokenData = Depends(get_current_user)):
    """Get all data access requests received by a user"""
    
    # Verify user can access these requests
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    requests = list(data_requests_collection.find(
        {"target_user_id": user_id},
        sort=[("created_at", -1)]
    ))
    
    # Convert ObjectId to string
    for req in requests:
        req["_id"] = str(req["_id"])
        req["created_at"] = req["created_at"].isoformat()
        req["expires_at"] = req["expires_at"].isoformat()
        if req.get("responded_at"):
            req["responded_at"] = req["responded_at"].isoformat()
    
    return jsonable_encoder(requests)

@router.get("/sent/{org_id}")
async def get_sent_requests(org_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get all data access requests sent by an organization"""
    
    # Verify user is admin of this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    requests = list(data_requests_collection.find(
        {"requester_org_id": org_id},
        sort=[("created_at", -1)]
    ))
    
    # Convert ObjectId to string
    for req in requests:
        req["_id"] = str(req["_id"])
        req["created_at"] = req["created_at"].isoformat()
        req["expires_at"] = req["expires_at"].isoformat()
        if req.get("responded_at"):
            req["responded_at"] = req["responded_at"].isoformat()
    
    return jsonable_encoder(requests)

@router.get("/org/{org_id}")
async def get_organization_data_requests(org_id: str):
    """Get all data requests for an organization (as requester or target)"""
    # Get requests where this org is the requester
    requester_requests = list(data_requests_collection.find({
        "requester_org_id": org_id
    }))
    
    # Get requests where this org is the target (for users who have shared data with this org)
    target_requests = list(data_requests_collection.find({
        "target_org_id": org_id
    }))
    
    # Combine and format
    all_requests = requester_requests + target_requests
    
    # Sort by created_at (newest first)
    all_requests.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    
    # Format response
    formatted_requests = []
    for req in all_requests:
        formatted_requests.append({
            "request_id": req["request_id"],
            "requester_org_id": req["requester_org_id"],
            "requester_org_name": req["requester_org_name"],
            "target_user_id": req["target_user_id"],
            "target_user_email": req["target_user_email"],
            "requested_resources": req["requested_resources"],
            "purpose": req["purpose"],
            "retention_window": req["retention_window"],
            "status": req["status"],
            "request_message": req.get("request_message"),
            "response_message": req.get("response_message"),
            "created_at": req["created_at"].isoformat(),
            "expires_at": req["expires_at"].isoformat(),
            "responded_at": req.get("responded_at").isoformat() if req.get("responded_at") else None,
            "responded_by": req.get("responded_by")
        })
    
    return formatted_requests

@router.post("/respond")
async def respond_to_request(
    response_data: RespondToRequest,
    current_user: TokenData = Depends(get_current_user),
    http_request: Request = None
):
    """Respond to a data access request (approve/reject)"""
    
    # Get the request
    request = data_requests_collection.find_one({"request_id": response_data.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Verify user can respond to this request
    if request["target_user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if request is still pending
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request has already been responded to")
    
    # Check if request has expired
    if datetime.utcnow() > request["expires_at"]:
        raise HTTPException(status_code=400, detail="Request has expired")
    
    # Update request
    update_data = {
        "status": response_data.status,
        "response_message": response_data.response_message,
        "responded_at": datetime.utcnow(),
        "responded_by": current_user.user_id
    }
    
    data_requests_collection.update_one(
        {"request_id": response_data.request_id},
        {"$set": update_data}
    )
    
    # If approved, create policies automatically
    if response_data.status == "approved":
        from routers.policy import create_policy_internal
        from models import UserInputPII
        
        # Get user's PII data
        user_pii = user_pii_collection.find_one({"user_id": current_user.user_id})
        if user_pii:
            for resource in request["requested_resources"]:
                pii_entry = next((pii for pii in user_pii.get("pii", []) if pii["resource"] == resource), None)
                if pii_entry:
                    try:
                        from helpers import decrypt_pii
                        pii_value = decrypt_pii(pii_entry["original"])
                        
                        # Get client IP
                        client_ip = "unknown"
                        if http_request:
                            forwarded_for = http_request.headers.get("X-Forwarded-For")
                            if forwarded_for:
                                client_ip = forwarded_for.split(",")[0].strip()
                            elif http_request.headers.get("X-Real-IP"):
                                client_ip = http_request.headers.get("X-Real-IP")
                            elif http_request.client:
                                client_ip = http_request.client.host
                        
                        # Create policy
                        policy_input = UserInputPII(pii_value=pii_value, resource=resource)
                        create_policy_internal(
                            policy_input, 
                            user_id=current_user.user_id,
                            ip_address=client_ip,
                            target_org_id=request["requester_org_id"]
                        )
                    except Exception as e:
                        print(f"Error creating policy for {resource}: {e}")
    
    # Send WebSocket notification to requester organization
    await send_user_update(
        user_id=str(request["requester_org_id"]),
        update_type="data_request_responded",
        data={
            "request_id": response_data.request_id,
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
    
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": request["requester_org_name"],
        "resource_name": ", ".join(request["requested_resources"]),
        "purpose": request["purpose"],
        "log_type": "data_request_response",
        "ip_address": client_ip,
        "data_source": "individual",
        "created_at": datetime.utcnow(),
        "request_id": response_data.request_id,
        "response_status": response_data.status
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": f"Request {response_data.status} successfully",
        "request_id": response_data.request_id,
        "status": response_data.status
    }

@router.get("/stats/{user_id}")
async def get_request_stats(user_id: int, current_user: TokenData = Depends(get_current_user)):
    """Get statistics about data requests for a user"""
    
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Count requests by status
    stats = {
        "total_received": data_requests_collection.count_documents({"target_user_id": user_id}),
        "pending": data_requests_collection.count_documents({"target_user_id": user_id, "status": "pending"}),
        "approved": data_requests_collection.count_documents({"target_user_id": user_id, "status": "approved"}),
        "rejected": data_requests_collection.count_documents({"target_user_id": user_id, "status": "rejected"}),
        "expired": data_requests_collection.count_documents({"target_user_id": user_id, "status": "expired"})
    }
    
    return stats 