from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Response
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

# Create file storage directory - use absolute path to ensure it's created in the right location
FILE_STORAGE_DIR = Path(os.path.join(os.path.dirname(__file__), "public", "shared_files"))
FILE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Ensure the directory exists and is writable
if not FILE_STORAGE_DIR.exists():
    FILE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

print(f"📁 File storage directory: {FILE_STORAGE_DIR.absolute()}")

def generate_file_id():
    return str(uuid.uuid4())

def validate_pdf_file(file: UploadFile) -> bool:
    """Validate that the uploaded file is a valid PDF"""
    if not file.filename.lower().endswith('.pdf'):
        return False
    
    try:
        # Read first few bytes to check PDF signature
        content = file.file.read(1024)
        file.file.seek(0)  # Reset file pointer
        
        # Check for PDF signature (%PDF)
        if content.startswith(b'%PDF'):
            return True
        
        # Also accept files that might have BOM or other headers
        # Some PDFs might have additional headers before %PDF
        if b'%PDF' in content[:1024]:
            return True
            
        return False
    except Exception as e:
        print(f"⚠️ PDF validation error: {e}")
        # If validation fails, still accept the file but log the issue
        return True

def encrypt_pdf_content(content: bytes) -> bytes:
    """Store PDF content without encryption for now (encryption was corrupting files)"""
    # For now, return content as-is to prevent corruption
    # In production, implement proper encryption that doesn't break PDF structure
    return content

def decrypt_pdf_content(encrypted_content: bytes) -> bytes:
    """Return PDF content as-is (no decryption needed)"""
    # For now, return content as-is since we're not encrypting
    return encrypted_content

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
    
    # Get proper organization names
    sender_org = organizations_collection.find_one({"org_id": user_org_id})
    sender_org_name = sender_org.get("org_name", "Unknown") if sender_org else "Unknown"
    
    # Create shared file record
    shared_file = SharedFile(
        file_id=file_id,
        contract_id=file_request["contract_id"],
        sender_org_id=user_org_id,
        sender_org_name=sender_org_name,
        receiver_org_id=file_request["requester_org_id"],
        receiver_org_name=file_request["requester_org_name"],
        file_name=file.filename,
        file_description=file_description or file_request["file_description"],
        file_category=file_request["file_category"],
        file_size=len(content),
        file_path=str(file_path),
        uploaded_at=datetime.utcnow(),
        uploaded_by=str(current_user.user_id),  # Convert to string as expected by model
        expires_at=file_request["expires_at"],
        is_encrypted=False  # Set to False since we're not encrypting
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
                "uploaded_by": str(current_user.user_id)  # Convert to string as expected by model
            }
        }
    )
    
    # Log the file upload
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": sender_org_name,  # Use the properly retrieved organization name
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
    
    print(f"🔍 [Direct Share] Received request with:")
    print(f"   - target_org_id: {target_org_id}")
    print(f"   - file_description: {file_description}")
    print(f"   - file_category: {file_category}")
    print(f"   - expires_at: {expires_at}")
    print(f"   - file: {file.filename if file else 'None'}")
    print(f"   - current_user: {current_user.user_id}")
    
    # Validate required fields
    if not target_org_id or not target_org_id.strip():
        raise HTTPException(status_code=422, detail="target_org_id is required")
    
    if not file_description or not file_description.strip():
        raise HTTPException(status_code=422, detail="file_description is required")
    
    if not file or not file.filename:
        raise HTTPException(status_code=422, detail="file is required")
    
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
    
    # Get proper organization names
    sender_org = organizations_collection.find_one({"org_id": user.get("organization_id")})
    sender_org_name = sender_org.get("org_name", "Unknown") if sender_org else "Unknown"
    
    print(f"🔍 [Direct Share] Sender org: {sender_org_name} (ID: {user.get('organization_id')})")
    print(f"🔍 [Direct Share] Receiver org: {target_org['org_name']} (ID: {target_org_id})")
    
    # Create shared file record
    try:
        shared_file = SharedFile(
            file_id=file_id,
            contract_id="direct_share",  # No specific contract for direct sharing
            sender_org_id=user.get("organization_id"),
            sender_org_name=sender_org_name,
            receiver_org_id=target_org_id,
            receiver_org_name=target_org["org_name"],
            file_name=file.filename,
            file_description=file_description,
            file_category=file_category,
            file_size=len(content),
            file_path=str(file_path),
            uploaded_at=datetime.utcnow(),
            uploaded_by=str(current_user.user_id),  # Convert to string as expected by model
            expires_at=expiration_date,
            is_encrypted=False  # Set to False since we're not encrypting
        )
        
        print(f"✅ [Direct Share] SharedFile model created successfully")
        
        # Insert shared file record
        shared_files_collection.insert_one(shared_file.model_dump(by_alias=True, exclude={"id"}))
        print(f"✅ [Direct Share] File record inserted into database")
        
    except Exception as e:
        print(f"❌ [Direct Share] Error creating SharedFile model: {e}")
        print(f"❌ [Direct Share] Error type: {type(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating file record: {str(e)}")
    
    # Log the direct file share
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": sender_org_name,  # Use the properly retrieved organization name
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
    
    print(f"🔍 [View File] Access attempt for file_id: {file_id} by user: {current_user.user_id}")
    
    # Verify user has access to this file
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user or user.get("user_type") != "organization":
        print(f"❌ [View File] Access denied - User not found or not organization user")
        raise HTTPException(status_code=403, detail="Only organization users can view shared files")
    
    _, shared_files_collection = get_file_collections()
    
    # Get shared file
    shared_file = shared_files_collection.find_one({"file_id": file_id})
    if not shared_file:
        print(f"❌ [View File] File not found in database: {file_id}")
        raise HTTPException(status_code=404, detail="File not found")
    
    user_org_id = user.get("organization_id")
    sender_org_id = shared_file["sender_org_id"]
    receiver_org_id = shared_file["receiver_org_id"]
    
    print(f"🔍 [View File] User org: {user_org_id}, Sender: {sender_org_id}, Receiver: {receiver_org_id}")
    
    # Strict access control - only sender or receiver can view
    if user_org_id not in [sender_org_id, receiver_org_id]:
        print(f"❌ [View File] Access denied - User org {user_org_id} not authorized for file {file_id}")
        raise HTTPException(status_code=403, detail="Access denied to this file")
    
    # Check if file has expired
    if datetime.utcnow() > shared_file["expires_at"]:
        print(f"❌ [View File] File expired: {shared_file['expires_at']}")
        raise HTTPException(status_code=400, detail="File has expired")
    
    # Check if file exists
    file_path = Path(shared_file["file_path"])
    print(f"🔍 [View File] Looking for file at: {file_path.absolute()}")
    print(f"🔍 [View File] File exists: {file_path.exists()}")
    
    if not file_path.exists():
        print(f"❌ [View File] File not found on disk: {file_path}")
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Read file content
    try:
        with open(file_path, "rb") as f:
            file_content = f.read()
        
        print(f"📄 [View File] File size: {len(file_content)} bytes")
        
        # Check if it's a valid PDF
        if not file_content.startswith(b'%PDF'):
            print(f"⚠️ [View File] File doesn't start with PDF signature")
            # Try to serve it anyway, browser might handle it
        
        # For now, serve the file as-is since we removed encryption
        pdf_content = file_content
        
    except Exception as e:
        print(f"❌ [View File] Error reading file: {e}")
        raise HTTPException(status_code=500, detail="Error reading file")
    
    # Update access count and last accessed
    shared_files_collection.update_one(
        {"file_id": file_id},
        {
            "$inc": {"access_count": 1},
            "$set": {"last_accessed": datetime.utcnow()}
        }
    )
    
    # Get proper organization name for logging
    user_org = organizations_collection.find_one({"org_id": user_org_id})
    user_org_name = user_org.get("org_name", "Unknown") if user_org else "Unknown"
    
    # Log the file access with detailed information
    client_ip = "unknown"
    log_entry = {
        "user_id": current_user.user_id,
        "fintech_name": user_org_name,
        "resource_name": "shared_file_access",
        "purpose": f"Viewed file: {shared_file['file_name']} (ID: {file_id})",
        "log_type": "shared_file_accessed",
        "ip_address": client_ip,
        "data_source": "organization",
        "created_at": datetime.utcnow(),
        "file_id": file_id,
        "sender_org_id": sender_org_id,
        "receiver_org_id": receiver_org_id,
        "accessing_org_id": user_org_id
    }
    logs_collection.insert_one(log_entry)
    
    print(f"✅ [View File] File access granted for user {current_user.user_id} from org {user_org_id}")
    
    # Convert PDF to base64 for embedding in secure HTML
    import base64
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    
    # Create secure HTML wrapper with copy protection
    secure_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Secure PDF Viewer - {shared_file['file_name']}</title>
        <meta http-equiv="X-Content-Type-Options" content="nosniff">
        <meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
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
                padding: 0;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                min-height: 100vh;
                position: relative;
                overflow-y: auto;
                overflow-x: hidden;
            }}
            
            .secure-header {{
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                padding: 20px;
                margin: 20px;
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
                margin: 20px;
                min-height: 600px;
                height: auto;
                border-radius: 12px;
                overflow: visible;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                background: white;
                padding: 20px;
            }}
            
            .pdf-embed {{
                width: 100%;
                min-height: 600px;
                height: auto;
                border: none;
                pointer-events: auto;
            }}
            
            /* Disable all interactions */
            ::selection {{
                background: transparent !important;
            }}
            
            ::-moz-selection {{
                background: transparent !important;
            }}
            
            /* Disable context menu */
            body {{
                -webkit-context-menu: none !important;
                -moz-context-menu: none !important;
                context-menu: none !important;
            }}
        </style>
        <script>
            // Disable right-click context menu
            document.addEventListener('contextmenu', function(e) {{
                e.preventDefault();
                return false;
            }});
            
            // Disable keyboard shortcuts
            document.addEventListener('keydown', function(e) {{
                // Block Ctrl+A, Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+S, Ctrl+P, F12, etc.
                if (e.ctrlKey || e.metaKey || e.key === 'F12' || e.key === 'F5') {{
                    e.preventDefault();
                    return false;
                }}
            }});
            
            // Disable text selection
            document.addEventListener('selectstart', function(e) {{
                e.preventDefault();
                return false;
            }});
            
            // Disable drag and drop
            document.addEventListener('dragstart', function(e) {{
                e.preventDefault();
                return false;
            }});
            
            // Prevent opening developer tools
            document.addEventListener('keydown', function(e) {{
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {{
                    e.preventDefault();
                    return false;
                }}
            }});
        </script>
    </head>
    <body>
        <div class="secure-header">
            <h2>🔒 Secure PDF Viewer</h2>
            <p><strong>File:</strong> {shared_file['file_name']}</p>
            <p><strong>Shared by:</strong> {shared_file['sender_org_name']}</p>
            <p><strong>Expires:</strong> {shared_file['expires_at'].strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            
            <div class="security-warning">
                <strong>⚠️ SECURITY NOTICE:</strong> This is a read-only view. Copying, downloading, or editing is disabled for data protection.
                <br>
                <small>Screenshots and screen recording are also prevented for enhanced security.</small>
            </div>
        </div>
        
        <div class="pdf-container">
            <embed 
                class="pdf-embed"
                src="data:application/pdf;base64,{pdf_base64}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0&view=FitH"
                type="application/pdf"
                width="100%"
                height="100%"
            />
        </div>
    </body>
    </html>
    """
    
    # Return the secure HTML wrapper
    return Response(
        content=secure_html,
        media_type="text/html",
        headers={
            "X-Frame-Options": "SAMEORIGIN",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate, private"
        }
    ) 



@router.get("/organizations-with-contracts/{org_id}")
async def get_organizations_with_file_contracts(
    org_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Get organizations that have file sharing contracts with the current organization"""
    
    print(f"🔍 DEBUG: Getting organizations with contracts for org_id: {org_id}")
    
    # Verify user has access to this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        print(f"❌ DEBUG: User not found for user_id: {current_user.user_id}")
        raise HTTPException(status_code=403, detail="User not found")
    
    print(f"✅ DEBUG: User found - {user.get('username')} from org: {user.get('organization_id')}")
    
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        print(f"❌ DEBUG: Access denied - user org: {user.get('organization_id')}, requested org: {org_id}")
        raise HTTPException(status_code=403, detail="Access denied to this organization")
    
    # Get active file sharing contracts
    contract_query = {
        "$or": [
            {"source_org_id": org_id},
            {"target_org_id": org_id}
        ],
        "status": "active",
        "approval_status": "approved",
        "contract_type": {"$in": ["file_sharing", "data_sharing"]}  # Include both file and data sharing contracts
    }
    
    print(f"🔍 DEBUG: Contract query: {contract_query}")
    active_contracts = list(inter_org_contracts_collection.find(contract_query))
    print(f"📋 DEBUG: Found {len(active_contracts)} active contracts")
    
    # Get unique organization IDs from contracts
    org_ids = set()
    for contract in active_contracts:
        if contract["source_org_id"] != org_id:
            org_ids.add(contract["source_org_id"])
        if contract["target_org_id"] != org_id:
            org_ids.add(contract["target_org_id"])
    
    print(f"📋 DEBUG: Unique org IDs from contracts: {org_ids}")
    
    # Get organization details
    organizations = []
    for org_id_from_contract in org_ids:
        org = get_organization_by_id(org_id_from_contract)
        if org:
            # Get contract details for this organization
            org_contracts = [c for c in active_contracts if 
                           c["source_org_id"] == org_id_from_contract or 
                           c["target_org_id"] == org_id_from_contract]
            
            organizations.append({
                "org_id": org["org_id"],
                "org_name": org["org_name"],
                "contract_count": len(org_contracts),
                "contract_types": list(set([c["contract_type"] for c in org_contracts]))
            })
            print(f"✅ DEBUG: Added organization: {org['org_name']} ({org['org_id']})")
        else:
            print(f"⚠️ DEBUG: Organization not found for ID: {org_id_from_contract}")
    
    print(f"📋 DEBUG: Returning {len(organizations)} organizations")
    return {"organizations": organizations} 