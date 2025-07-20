from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse, FileResponse
from datetime import datetime, timedelta
from typing import List, Optional
import os
import uuid
import hashlib
import shutil
import base64
from pathlib import Path
import PyPDF2
import io

from helpers import (
    users_collection, 
    organizations_collection, 
    inter_org_contracts_collection,
    logs_collection,
    get_organization_by_id,
    get_client_ip
)
from jwt_utils import get_current_user, TokenData
from models import (
    FileRequest, 
    SharedFile, 
    CreateFileRequest, 
    UploadFileRequest, 
    DirectFileShare
)

router = APIRouter(prefix="/file-sharing", tags=["File Sharing"])

# Create collections for file sharing
file_requests_collection = None
shared_files_collection = None

def get_file_collections():
    global file_requests_collection, shared_files_collection
    if file_requests_collection is None:
        from helpers import get_database
        db = get_database()
        file_requests_collection = db["file_requests"]
        shared_files_collection = db["shared_files"]
    return file_requests_collection, shared_files_collection

# Create file storage directory
FILE_STORAGE_DIR = Path("public/shared_files")
FILE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def generate_file_id():
    return str(uuid.uuid4())

def validate_pdf_file(file: UploadFile) -> bool:
    """Validate that the uploaded file is a valid PDF"""
    if not file.filename.lower().endswith('.pdf'):
        return False
    
    # Read first few bytes to check PDF signature
    content = file.file.read(1024)
    file.file.seek(0)  # Reset file pointer
    
    return content.startswith(b'%PDF')

def encrypt_pdf_content(content: bytes) -> bytes:
    """Simple encryption for PDF content (in production, use proper encryption)"""
    # This is a basic implementation - in production, use proper encryption
    key = b'pedolone_secure_key_2024'
    encrypted = bytearray()
    for i, byte in enumerate(content):
        encrypted.append(byte ^ key[i % len(key)])
    return bytes(encrypted)

def decrypt_pdf_content(encrypted_content: bytes) -> bytes:
    """Decrypt PDF content"""
    key = b'pedolone_secure_key_2024'
    decrypted = bytearray()
    for i, byte in enumerate(encrypted_content):
        decrypted.append(byte ^ key[i % len(key)])
    return bytes(decrypted)

@router.post("/request-file")
async def create_file_request(
    request_data: CreateFileRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Create a file request for a specific contract"""
    
    # Verify user is from requesting organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can create file requests")
    
    file_requests_collection, _ = get_file_collections()
    
    # Verify contract exists and user has access
    contract = inter_org_contracts_collection.find_one({"contract_id": request_data.contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    user_org_id = user.get("organization_id")
    if user_org_id not in [contract["source_org_id"], contract["target_org_id"]]:
        raise HTTPException(status_code=403, detail="Access denied to this contract")
    
    # Verify target organization
    target_org = get_organization_by_id(request_data.target_org_id)
    if not target_org:
        raise HTTPException(status_code=404, detail="Target organization not found")
    
    # Create file request
    request_id = generate_file_id()
    expires_at = request_data.expires_at or (datetime.utcnow() + timedelta(days=30))
    
    file_request = FileRequest(
        request_id=request_id,
        contract_id=request_data.contract_id,
        requester_org_id=user_org_id,
        requester_org_name=user.get("organization_name", "Unknown"),
        target_org_id=request_data.target_org_id,
        target_org_name=target_org["org_name"],
        file_description=request_data.file_description,
        file_category=request_data.file_category,
        status="pending",
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    
    # Insert into database
    file_requests_collection.insert_one(file_request.model_dump(by_alias=True, exclude={"id"}))
    
    # Log the file request
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": user.get("organization_name", "Unknown"),
        "resource_name": "file_request",
        "purpose": f"File request: {request_data.file_description}",
        "log_type": "file_request_created",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "contract_id": request_data.contract_id,
        "file_request_id": request_id
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "File request created successfully",
        "request_id": request_id,
        "status": "pending"
    }

@router.get("/requests/{org_id}")
async def get_file_requests(
    org_id: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: TokenData = Depends(get_current_user)
):
    """Get file requests for an organization"""
    
    # Verify user has access to this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this organization's file requests")
    
    file_requests_collection, _ = get_file_collections()
    
    # Build query filter
    query_filter = {
        "$or": [
            {"requester_org_id": org_id},
            {"target_org_id": org_id}
        ]
    }
    
    if status:
        query_filter["status"] = status
    
    # Get file requests
    requests = list(file_requests_collection.find(query_filter).sort("created_at", -1))
    
    # Format response
    formatted_requests = []
    for req in requests:
        formatted_requests.append({
            "request_id": req["request_id"],
            "contract_id": req["contract_id"],
            "requester_org_id": req["requester_org_id"],
            "requester_org_name": req["requester_org_name"],
            "target_org_id": req["target_org_id"],
            "target_org_name": req["target_org_name"],
            "file_description": req["file_description"],
            "file_category": req["file_category"],
            "status": req["status"],
            "created_at": req["created_at"].isoformat(),
            "expires_at": req["expires_at"].isoformat(),
            "approved_at": req.get("approved_at", ""),
            "rejected_at": req.get("rejected_at", ""),
            "rejection_reason": req.get("rejection_reason", ""),
            "uploaded_file_id": req.get("uploaded_file_id", ""),
            "uploaded_file_name": req.get("uploaded_file_name", ""),
            "uploaded_file_size": req.get("uploaded_file_size", 0),
            "uploaded_at": req.get("uploaded_at", ""),
            "uploaded_by": req.get("uploaded_by", ""),
            "is_requester": req["requester_org_id"] == org_id
        })
    
    return {"file_requests": formatted_requests}

@router.post("/approve-request/{request_id}")
async def approve_file_request(
    request_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Approve a file request"""
    
    # Verify user is from target organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can approve file requests")
    
    file_requests_collection, _ = get_file_collections()
    
    # Get file request
    file_request = file_requests_collection.find_one({"request_id": request_id})
    if not file_request:
        raise HTTPException(status_code=404, detail="File request not found")
    
    # Verify user is from target organization
    user_org_id = user.get("organization_id")
    if file_request["target_org_id"] != user_org_id:
        raise HTTPException(status_code=403, detail="Only target organization can approve file requests")
    
    if file_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="File request is not pending")
    
    # Update file request status
    file_requests_collection.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.utcnow()
            }
        }
    )
    
    # Log the approval
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": user.get("organization_name", "Unknown"),
        "resource_name": "file_request_approval",
        "purpose": f"Approved file request: {file_request['file_description']}",
        "log_type": "file_request_approved",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "file_request_id": request_id
    }
    logs_collection.insert_one(log_entry)
    
    return {"message": "File request approved successfully"}

@router.post("/reject-request/{request_id}")
async def reject_file_request(
    request_id: str,
    rejection_reason: str = Form(...),
    current_user: TokenData = Depends(get_current_user)
):
    """Reject a file request"""
    
    # Verify user is from target organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can reject file requests")
    
    file_requests_collection, _ = get_file_collections()
    
    # Get file request
    file_request = file_requests_collection.find_one({"request_id": request_id})
    if not file_request:
        raise HTTPException(status_code=404, detail="File request not found")
    
    # Verify user is from target organization
    user_org_id = user.get("organization_id")
    if file_request["target_org_id"] != user_org_id:
        raise HTTPException(status_code=403, detail="Only target organization can reject file requests")
    
    if file_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="File request is not pending")
    
    # Update file request status
    file_requests_collection.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": datetime.utcnow(),
                "rejection_reason": rejection_reason
            }
        }
    )
    
    # Log the rejection
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": user.get("organization_name", "Unknown"),
        "resource_name": "file_request_rejection",
        "purpose": f"Rejected file request: {file_request['file_description']}",
        "log_type": "file_request_rejected",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "file_request_id": request_id,
        "rejection_reason": rejection_reason
    }
    logs_collection.insert_one(log_entry)
    
    return {"message": "File request rejected successfully"}

@router.post("/upload-file/{request_id}")
async def upload_file_for_request(
    request_id: str,
    file: UploadFile = File(...),
    file_description: Optional[str] = Form(None),
    current_user: TokenData = Depends(get_current_user)
):
    """Upload a PDF file for an approved file request"""
    
    # Verify user is from target organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can upload files")
    
    file_requests_collection, shared_files_collection = get_file_collections()
    
    # Get file request
    file_request = file_requests_collection.find_one({"request_id": request_id})
    if not file_request:
        raise HTTPException(status_code=404, detail="File request not found")
    
    # Verify user is from target organization
    user_org_id = user.get("organization_id")
    if file_request["target_org_id"] != user_org_id:
        raise HTTPException(status_code=403, detail="Only target organization can upload files")
    
    if file_request["status"] != "approved":
        raise HTTPException(status_code=400, detail="File request is not approved")
    
    # Validate PDF file
    if not validate_pdf_file(file):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Read file content
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    # Encrypt file content
    encrypted_content = encrypt_pdf_content(content)
    
    # Generate file ID and save file
    file_id = generate_file_id()
    file_path = FILE_STORAGE_DIR / f"{file_id}.pdf"
    
    with open(file_path, "wb") as f:
        f.write(encrypted_content)
    
    # Create shared file record
    shared_file = SharedFile(
        file_id=file_id,
        contract_id=file_request["contract_id"],
        sender_org_id=user_org_id,
        sender_org_name=user.get("organization_name", "Unknown"),
        receiver_org_id=file_request["requester_org_id"],
        receiver_org_name=file_request["requester_org_name"],
        file_name=file.filename,
        file_description=file_description or file_request["file_description"],
        file_category=file_request["file_category"],
        file_size=len(content),
        file_path=str(file_path),
        uploaded_at=datetime.utcnow(),
        uploaded_by=current_user.user_id,
        expires_at=file_request["expires_at"]
    )
    
    # Insert shared file record
    shared_files_collection.insert_one(shared_file.model_dump(by_alias=True, exclude={"id"}))
    
    # Update file request
    file_requests_collection.update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "completed",
                "uploaded_file_id": file_id,
                "uploaded_file_name": file.filename,
                "uploaded_file_size": len(content),
                "uploaded_at": datetime.utcnow(),
                "uploaded_by": current_user.user_id
            }
        }
    )
    
    # Log the file upload
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": user.get("organization_name", "Unknown"),
        "resource_name": "file_upload",
        "purpose": f"Uploaded file: {file.filename}",
        "log_type": "file_uploaded",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "file_request_id": request_id,
        "file_id": file_id,
        "file_size": len(content)
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "File uploaded successfully",
        "file_id": file_id,
        "file_name": file.filename,
        "file_size": len(content)
    }

@router.post("/direct-share")
async def direct_file_share(
    target_org_id: str = Form(...),
    file_description: str = Form(...),
    file_category: str = Form("contract"),
    expires_at: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user)
):
    """Directly share a PDF file with another organization"""
    
    # Verify user is from organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can share files")
    
    _, shared_files_collection = get_file_collections()
    
    # Verify target organization
    target_org = get_organization_by_id(target_org_id)
    if not target_org:
        raise HTTPException(status_code=404, detail="Target organization not found")
    
    # Validate PDF file
    if not validate_pdf_file(file):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Read file content
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    # Encrypt file content
    encrypted_content = encrypt_pdf_content(content)
    
    # Generate file ID and save file
    file_id = generate_file_id()
    file_path = FILE_STORAGE_DIR / f"{file_id}.pdf"
    
    with open(file_path, "wb") as f:
        f.write(encrypted_content)
    
    # Parse expiration date
    expiration_date = None
    if expires_at:
        try:
            expiration_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except:
            expiration_date = datetime.utcnow() + timedelta(days=30)
    else:
        expiration_date = datetime.utcnow() + timedelta(days=30)
    
    # Create shared file record
    shared_file = SharedFile(
        file_id=file_id,
        contract_id="direct_share",  # No specific contract for direct sharing
        sender_org_id=user.get("organization_id"),
        sender_org_name=user.get("organization_name", "Unknown"),
        receiver_org_id=target_org_id,
        receiver_org_name=target_org["org_name"],
        file_name=file.filename,
        file_description=file_description,
        file_category=file_category,
        file_size=len(content),
        file_path=str(file_path),
        uploaded_at=datetime.utcnow(),
        uploaded_by=current_user.user_id,
        expires_at=expiration_date
    )
    
    # Insert shared file record
    shared_files_collection.insert_one(shared_file.model_dump(by_alias=True, exclude={"id"}))
    
    # Log the direct file share
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": user.get("organization_name", "Unknown"),
        "resource_name": "direct_file_share",
        "purpose": f"Direct file share: {file.filename}",
        "log_type": "direct_file_shared",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "file_id": file_id,
        "target_org_id": target_org_id,
        "file_size": len(content)
    }
    logs_collection.insert_one(log_entry)
    
    return {
        "message": "File shared successfully",
        "file_id": file_id,
        "file_name": file.filename,
        "file_size": len(content)
    }

@router.get("/shared-files/{org_id}")
async def get_shared_files(
    org_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Get shared files for an organization"""
    
    # Verify user has access to this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this organization's shared files")
    
    _, shared_files_collection = get_file_collections()
    
    # Get shared files
    shared_files = list(shared_files_collection.find({
        "$or": [
            {"sender_org_id": org_id},
            {"receiver_org_id": org_id}
        ]
    }).sort("uploaded_at", -1))
    
    # Format response
    formatted_files = []
    for file in shared_files:
        formatted_files.append({
            "file_id": file["file_id"],
            "contract_id": file["contract_id"],
            "sender_org_id": file["sender_org_id"],
            "sender_org_name": file["sender_org_name"],
            "receiver_org_id": file["receiver_org_id"],
            "receiver_org_name": file["receiver_org_name"],
            "file_name": file["file_name"],
            "file_description": file["file_description"],
            "file_category": file["file_category"],
            "file_size": file["file_size"],
            "uploaded_at": file["uploaded_at"].isoformat(),
            "expires_at": file["expires_at"].isoformat(),
            "access_count": file.get("access_count", 0),
            "last_accessed": file.get("last_accessed", ""),
            "is_sender": file["sender_org_id"] == org_id
        })
    
    return {"shared_files": formatted_files}

@router.get("/view-file/{file_id}")
async def view_shared_file(
    file_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """View a shared PDF file securely"""
    
    # Verify user has access to this file
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can view shared files")
    
    _, shared_files_collection = get_file_collections()
    
    # Get shared file
    shared_file = shared_files_collection.find_one({"file_id": file_id})
    if not shared_file:
        raise HTTPException(status_code=404, detail="File not found")
    
    user_org_id = user.get("organization_id")
    if user_org_id not in [shared_file["sender_org_id"], shared_file["receiver_org_id"]]:
        raise HTTPException(status_code=403, detail="Access denied to this file")
    
    # Check if file has expired
    if datetime.utcnow() > shared_file["expires_at"]:
        raise HTTPException(status_code=400, detail="File has expired")
    
    # Check if file exists
    file_path = Path(shared_file["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Read and decrypt file
    with open(file_path, "rb") as f:
        encrypted_content = f.read()
    
    decrypted_content = decrypt_pdf_content(encrypted_content)
    
    # Update access count and last accessed
    shared_files_collection.update_one(
        {"file_id": file_id},
        {
            "$inc": {"access_count": 1},
            "$set": {"last_accessed": datetime.utcnow()}
        }
    )
    
    # Log the file access
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": user.get("organization_name", "Unknown"),
        "resource_name": "shared_file_access",
        "purpose": f"Viewed file: {shared_file['file_name']}",
        "log_type": "shared_file_accessed",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "file_id": file_id
    }
    logs_collection.insert_one(log_entry)
    
    # Return secure HTML viewer
    secure_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Secure PDF Viewer - {shared_file['file_name']}</title>
        <meta http-equiv="X-Content-Type-Options" content="nosniff">
        <meta http-equiv="X-Frame-Options" content="DENY">
        <meta http-equiv="X-XSS-Protection" content="1; mode=block">
        <style>
            * {{
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
                -webkit-tap-highlight-color: transparent !important;
                -webkit-user-drag: none !important;
                -khtml-user-drag: none !important;
                -moz-user-drag: none !important;
                -o-user-drag: none !important;
                user-drag: none !important;
            }}
            
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                min-height: 100vh;
                position: relative;
                overflow-x: hidden;
            }}
            
            .secure-header {{
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
            }}
            
            .secure-header::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: linear-gradient(135deg, #dc3545 0%, #b91c1c 100%);
            }}
            
            .secure-header h2 {{
                color: #dc3545;
                margin: 0 0 15px 0;
                font-size: 1.5rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }}
            
            .secure-header p {{
                margin: 8px 0;
                color: #6c757d;
                font-size: 0.9rem;
            }}
            
            .security-warning {{
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 12px 16px;
                color: #92400e;
                font-weight: 600;
                margin-top: 15px;
                position: relative;
                overflow: hidden;
            }}
            
            .security-warning::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: #f59e0b;
            }}
            
            .pdf-container {{
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                position: relative;
                height: 80vh;
            }}
            
            .security-watermark {{
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 2rem;
                font-weight: bold;
                color: rgba(0, 0, 0, 0.02);
                pointer-events: none;
                z-index: 1;
                white-space: nowrap;
                user-select: none;
            }}
            
            @media print {{
                * {{
                    display: none !important;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="security-watermark">PEDOLONE SECURE PDF VIEWER</div>
        
        <div class="secure-header">
            <h2>🔒 Secure PDF Viewer</h2>
            <p><strong>File:</strong> {shared_file['file_name']}</p>
            <p><strong>Description:</strong> {shared_file['file_description']}</p>
            <p><strong>Category:</strong> {shared_file['file_category']}</p>
            <p><strong>From:</strong> {shared_file['sender_org_name']}</p>
            <p><strong>To:</strong> {shared_file['receiver_org_name']}</p>
            <p><strong>Uploaded:</strong> {shared_file['uploaded_at'].strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p><strong>Expires:</strong> {shared_file['expires_at'].strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p><strong>Access Count:</strong> {shared_file.get('access_count', 0) + 1}</p>
            
            <div class="security-warning">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span>⚠️</span>
                    <strong>SECURITY NOTICE</strong>
                </div>
                <div style="font-size: 0.85rem;">
                    This PDF is view-only. Download, copy, editing, and screenshots are disabled for data protection.
                </div>
            </div>
        </div>
        
        <div class="pdf-container">
            <iframe
                src="data:application/pdf;base64,{base64.b64encode(decrypted_content).decode()}"
                style="width: 100%; height: 100%; border: none;"
                title="Secure PDF Viewer"
                onContextMenu="return false;"
                onDragStart="return false;"
                onSelectStart="return false;"
            ></iframe>
        </div>
        
        <script>
            // Comprehensive screenshot prevention
            (function() {{
                'use strict';
                
                // Disable right-click context menu
                document.addEventListener('contextmenu', function(e) {{
                    e.preventDefault();
                    return false;
                }});
                
                // Disable keyboard shortcuts for copy, save, print, screenshot
                document.addEventListener('keydown', function(e) {{
                    // Prevent Ctrl/Cmd + C (copy)
                    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent Ctrl/Cmd + S (save)
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent Ctrl/Cmd + P (print)
                    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent Print Screen key
                    if (e.key === 'PrintScreen' || e.keyCode === 44) {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent F12 (developer tools)
                    if (e.key === 'F12' || e.keyCode === 123) {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent Ctrl/Cmd + Shift + I (developer tools)
                    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent Ctrl/Cmd + Shift + C (developer tools)
                    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent Ctrl/Cmd + Shift + J (developer tools)
                    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {{
                        e.preventDefault();
                        return false;
                    }}
                    
                    // Prevent Ctrl/Cmd + U (view source)
                    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {{
                        e.preventDefault();
                        return false;
                    }}
                }});
                
                // Disable drag and drop
                document.addEventListener('dragstart', function(e) {{
                    e.preventDefault();
                    return false;
                }});
                
                // Disable text selection
                document.addEventListener('selectstart', function(e) {{
                    e.preventDefault();
                    return false;
                }});
                
                // Disable copy events
                document.addEventListener('copy', function(e) {{
                    e.preventDefault();
                    return false;
                }});
                
                // Disable cut events
                document.addEventListener('cut', function(e) {{
                    e.preventDefault();
                    return false;
                }});
                
                // Prevent iframe embedding
                if (window.self !== window.top) {{
                    window.top.location = window.self.location;
                }}
                
                // Disable developer tools detection
                function detectDevTools() {{
                    const threshold = 160;
                    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
                    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
                    
                    if (widthThreshold || heightThreshold) {{
                        document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center;"><div><h1>🔒 Security Alert</h1><p>Developer tools are not allowed for security reasons.</p><p>Please close developer tools and refresh the page.</p></div></div>';
                    }}
                }}
                
                // Check for developer tools periodically
                setInterval(detectDevTools, 1000);
                
                // Disable print
                window.addEventListener('beforeprint', function(e) {{
                    e.preventDefault();
                    return false;
                }});
                
                // Prevent screen capture on some browsers
                if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {{
                    navigator.mediaDevices.getDisplayMedia = function() {{
                        return Promise.reject(new Error('Screen sharing is not allowed'));
                    }};
                }}
                
                // Disable console access
                console.log = function() {{}};
                console.warn = function() {{}};
                console.error = function() {{}};
                console.info = function() {{}};
                
            }})();
        </script>
    </body>
    </html>
    """
    
    return StreamingResponse(
        io.StringIO(secure_html),
        media_type="text/html",
        headers={
            "Content-Disposition": "inline",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate, private"
        }
    ) 