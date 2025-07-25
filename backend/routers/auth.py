
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Body, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import bcrypt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import asyncio
from dotenv import load_dotenv
import secrets
import uuid
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from models import (
    UserRegistration, UserLogin, OTPVerification, LoginVerification, 
    Token, TokenData, UserResponse, LoginResponse, RegisterResponse,
    PIIInput, ProfileUpdateRequest, PasswordUpdateRequest, ProfileUpdateResponse
)
from jwt_utils import create_access_token, get_current_user, get_token_expiry_time
from helpers import users_collection, user_pii_collection, encrypt_pii, decrypt_pii, validate_password_strength, logs_collection, get_client_ip
from routers.pii_tokenizer import tokenize_aadhaar, tokenize_pan


# Load environment variables
load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Validate required environment variables
if not EMAIL_USER or not EMAIL_PASSWORD:
    print("WARNING: Email credentials not configured. Email OTP will not work.")

def get_next_user_id() -> int:
    """Generate next user ID"""
    last_user = users_collection.find_one(sort=[("userid", -1)])
    if last_user:
        return last_user["userid"] + 1
    return 1

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return str(secrets.randbelow(900000) + 100000)

def generate_verification_token() -> str:
    """Generate secure verification token"""
    return str(uuid.uuid4())

async def log_failed_login_attempt(email: str, ip_address: str, request: Request = None):
    """Log failed login attempt and check for suspicious activity"""
    try:
        # Get IP address if not provided
        if not ip_address and request:
            ip_address = get_client_ip(request)
        
        # Find user by email
        user = users_collection.find_one({"email": email})
        user_id = user.get("userid") if user else None
        org_id = user.get("organization_id") if user else None
        
        # Log the failed attempt
        log_entry = {
            "user_id": user_id,
            "email": email,
            "ip_address": ip_address,
            "log_type": "login_failed",
            "description": f"Failed login attempt for email: {email}",
            "created_at": datetime.utcnow(),
            "organization_id": org_id
        }
        
        logs_collection.insert_one(log_entry)
        print(f"🔴 Logged failed login attempt for {email} from IP: {ip_address}")
        
        # If user exists and has organization, check for suspicious activity
        if user_id and org_id:
            # Import here to avoid circular imports
            from routers.alerts import check_failed_login_attempts
            await check_failed_login_attempts(org_id, user_id, ip_address)
            
    except Exception as e:
        print(f"Error logging failed login attempt: {e}")

async def send_verification_email(email: str, token: str, user_type: str = "individual") -> tuple[bool, str]:
    """Send verification email with link"""
    try:
        if not EMAIL_USER or not EMAIL_PASSWORD:
            # Development mode - return the verification link
            verification_link = f"{BACKEND_URL}/auth/verify-email?token={token}&email={email}"
            return True, f"DEVELOPMENT MODE - Verification link: {verification_link}"
        
        # Create verification link
        verification_link = f"{BACKEND_URL}/auth/verify-email?token={token}&email={email}"
        
        # Email content
        subject = "Verify Your Email - PedolOne"
        
        # Create HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to PedolOne!</h1>
                    <p>Secure PII Tokenization Platform</p>
                </div>
                <div class="content">
                    <h2>Verify Your Email Address</h2>
                    <p>Thank you for registering with PedolOne. To complete your {"organization" if user_type == "organization" else "individual"} account setup, please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">{verification_link}</p>
                    
                    <p><strong>This verification link will expire in 24 hours.</strong></p>
                    
                    <p>If you didn't create an account with us, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2025 PedolOne. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_USER
        msg['To'] = email
        
        # Add HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
        
        return True, "Verification email sent successfully"
        
    except Exception as e:
        print(f"Error sending verification email: {e}")
        verification_link = f"{BACKEND_URL}/auth/verify-email?token={token}&email={email}"
        return False, f"Email service unavailable. Verification link: {verification_link}"

async def send_email_otp(email: str, otp: str) -> tuple[bool, str]:
    """Send email OTP for login verification"""
    try:
        if not EMAIL_USER or not EMAIL_PASSWORD:
            return True, f"DEVELOPMENT MODE - OTP: {otp}"
        
        subject = "Your Login Verification Code - PedolOne"
        body = f"""
        Your login verification code is: {otp}
        
        This code will expire in 15 minutes.
        
        If you didn't request this code, please ignore this email.
        """
        
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = EMAIL_USER
        msg['To'] = email
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
        
        return True, "OTP sent successfully"
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return False, f"DEVELOPMENT MODE - OTP: {otp}"

async def cleanup_unverified_users():
    """Background task to cleanup unverified users after 24 hours"""
    while True:
        try:
            # Delete users who registered more than 24 hours ago and are not email verified
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            
            result = users_collection.delete_many({
                "$and": [
                    {"created_at": {"$lt": cutoff_time}},
                    {"email_verified": False}
                ]
            })
            
            if result.deleted_count > 0:
                print(f"Cleaned up {result.deleted_count} unverified user(s)")
                
        except Exception as e:
            print(f"Error in cleanup task: {str(e)}")
            
        # Wait 5 minutes before next cleanup
        await asyncio.sleep(300)

@router.on_event("startup")
async def startup_event():
    """Start cleanup task on startup"""
    asyncio.create_task(cleanup_unverified_users())

@router.post("/register", response_model=RegisterResponse)
async def register_user(user_data: UserRegistration):
    """Register a new user"""
    
    # Check if user already exists by email or username
    existing_user = users_collection.find_one({
        "$or": [
            {"email": user_data.email},
            {"username": user_data.username}
        ]
    })
    if existing_user:
        if existing_user.get("email") == user_data.email:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        elif existing_user.get("username") == user_data.username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Password strength validation
    is_strong, message = validate_password_strength(user_data.password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=message)
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Generate verification token
    verification_token = generate_verification_token()
    
    # Get next user ID
    user_id = get_next_user_id()
    
    # Create user document
    user_doc = {
        "userid": user_id,
        "username": user_data.username,
        "full_name": user_data.full_name,
        "email": user_data.email,
        "phone_number": user_data.phone_number,
        "password_hash": password_hash,
        "user_type": user_data.user_type,
        "organization_id": user_data.organization_id,  # Include organization_id
        "email_verified": False,
        "created_at": datetime.utcnow(),
        "verification_token": verification_token,
        "token_created_at": datetime.utcnow()
    }
    
    print(f"🔍 DEBUG: Creating user document with organization_id: {user_data.organization_id}")
    print(f"🔍 DEBUG: User document: {user_doc}")
    
    # Insert user into database
    result = users_collection.insert_one(user_doc)
    
    # Send verification email
    email_success, email_message = await send_verification_email(user_data.email, verification_token, user_data.user_type)
    
    # Prepare response message
    response_message = "Registration successful! We've sent a verification email to your email address. Please check your email and click the verification link to activate your account."
    
    # Add development message if email credentials are not configured
    if "development" in email_message.lower():
        response_message += f"\n\n🚨 DEVELOPMENT MODE:\n📧 {email_message}"
    
    return RegisterResponse(
        message=response_message,
        user_id=user_id,
        email_status=email_message
    )

@router.post("/register/user", response_model=RegisterResponse)
async def register_individual_user(user_data: UserRegistration):
    """Register a new individual user"""
    user_data.user_type = "individual"
    return await register_user(user_data)

@router.post("/register/organization", response_model=RegisterResponse)
async def register_organization(user_data: UserRegistration):
    """Register a new organization"""
    user_data.user_type = "organization"
    print(f"🔍 DEBUG: Organization registration - organization_id: {user_data.organization_id}")
    return await register_user(user_data)

@router.get("/verify-email")
async def verify_email_link(token: str, email: str):
    """Verify email using verification link"""
    
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if token is expired (24 hours)
    if user.get("token_created_at"):
        token_age = datetime.utcnow() - user["token_created_at"]
        if token_age > timedelta(hours=24):
            raise HTTPException(status_code=400, detail="Verification link has expired")
    
    # Verify token
    if user.get("verification_token") != token:
        raise HTTPException(status_code=400, detail="Invalid verification link")
    
    # Mark email as verified and clear token
    users_collection.update_one(
        {"email": email},
        {
            "$set": {"email_verified": True},
            "$unset": {"verification_token": "", "token_created_at": ""}
        }
    )
    
    # Redirect to success page with query parameters
    return RedirectResponse(
        url=f"{BACKEND_URL}/verification-success?email={email}",
        status_code=302
    )

@router.post("/verify-otp")
async def verify_otp(verification_data: OTPVerification):
    """Verify email OTP - Legacy endpoint"""
    
    user = users_collection.find_one({"email": verification_data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if OTP is expired (15 minutes)
    if user.get("otp_created_at"):
        otp_age = datetime.utcnow() - user["otp_created_at"]
        if otp_age > timedelta(minutes=15):
            raise HTTPException(status_code=400, detail="OTP has expired")
    
    # Verify email OTP
    if user.get("email_otp") != verification_data.otp:
        raise HTTPException(status_code=400, detail="Invalid email OTP")
    
    # Mark email as verified and clear OTP
    users_collection.update_one(
        {"email": verification_data.email},
        {
            "$set": {"email_verified": True},
            "$unset": {"email_otp": "", "otp_created_at": ""}
        }
    )
    
    return {
        "message": "Email verified successfully",
        "email_verified": True,
        "registration_complete": True
    }

@router.post("/login", response_model=LoginResponse)
async def login_user(login_data: UserLogin, request: Request):
    """Login user and initiate verification"""
    
    user = users_collection.find_one({"email": login_data.email})
    if not user:
        # Log failed login attempt
        await log_failed_login_attempt(login_data.email, None, request)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(login_data.password, user["password_hash"]):
        # Log failed login attempt
        await log_failed_login_attempt(login_data.email, None, request)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user email is verified
    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Please complete email verification first")
    
    # Generate new email OTP for login verification
    email_otp = generate_otp()
    print(f"🔑 DEBUG: Generated OTP for {login_data.email}: {email_otp}")
    
    # Update user with new OTP
    users_collection.update_one(
        {"email": login_data.email},
        {
            "$set": {
                "email_otp": email_otp,
                "otp_created_at": datetime.utcnow()
            }
        }
    )
    print(f"💾 DEBUG: OTP stored in database for {login_data.email}")
    
    # Send email OTP for login verification
    email_success, email_message = await send_email_otp(login_data.email, email_otp)
    
    response_message = "Login credentials verified. Please verify using email OTP to complete login."
    
    # Add development message if email credentials are not configured
    if "development" in email_message.lower():
        response_message += f"\n\n🚨 DEVELOPMENT MODE: Check console for OTP:\n📧 {email_message}"
    
    return LoginResponse(
        message=response_message,
        user_id=user["userid"],
        requires_verification=True,
        email_status=email_message
    )

@router.post("/verify-login", response_model=Token)
async def verify_login(verification_data: LoginVerification, http_request: Request = None):
    """Verify login with email OTP and return JWT token"""
    
    print(f"🔍 DEBUG: Verify login request - Email: {verification_data.email}, OTP: {verification_data.otp}")
    
    user = users_collection.find_one({"email": verification_data.email})
    if not user:
        print(f"❌ DEBUG: User not found for email: {verification_data.email}")
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"✅ DEBUG: User found - ID: {user.get('userid')}")
    print(f"🔑 DEBUG: Stored OTP: {user.get('email_otp')}")
    print(f"⏰ DEBUG: OTP created at: {user.get('otp_created_at')}")
    
    # Check if OTP is expired (15 minutes)
    if user.get("otp_created_at"):
        otp_age = datetime.utcnow() - user["otp_created_at"]
        print(f"⏱️ DEBUG: OTP age: {otp_age.total_seconds()} seconds")
        if otp_age > timedelta(minutes=15):
            print("❌ DEBUG: OTP has expired")
            raise HTTPException(status_code=400, detail="OTP has expired")
    else:
        print("❌ DEBUG: No OTP creation time found")
    
    # Verify email OTP
    stored_otp = user.get("email_otp")
    received_otp = verification_data.otp
    print(f"🔍 DEBUG: OTP comparison - Stored: '{stored_otp}' vs Received: '{received_otp}'")
    print(f"🔍 DEBUG: OTP types - Stored: {type(stored_otp)} vs Received: {type(received_otp)}")
    
    if stored_otp != received_otp:
        print("❌ DEBUG: Invalid email OTP - OTPs don't match")
        raise HTTPException(status_code=400, detail="Invalid email OTP")
    
    print("✅ DEBUG: OTP verification successful")
    
    # Clear OTP after successful verification
    users_collection.update_one(
        {"email": verification_data.email},
        {
            "$unset": {
                "email_otp": "",
                "otp_created_at": ""
            }
        }
    )
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": user["email"], "user_id": user["userid"]}
    )
    
    # Log successful login
    from routers.organization import logs_collection
    
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
    
    log_entry = {
        "user_id": user["userid"],
        "fintech_name": user.get("organization_id", "Individual User"),
        "resource_name": "login",
        "purpose": "authentication",
        "log_type": "user_login",
        "ip_address": client_ip,
        "data_source": "individual" if user.get("user_type") == "individual" else "organization",
        "created_at": datetime.utcnow(),
        "user_type": user.get("user_type", "individual"),
        "organization_id": user.get("organization_id")
    }
    logs_collection.insert_one(log_entry)
    
    print(f"🎉 DEBUG: Login verification successful for user: {user['userid']}")
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=get_token_expiry_time(),
        user_id=user["userid"],
        email=user["email"]
    )

@router.post("/resend-otp")
async def resend_otp(email: str):
    """Resend email OTP"""
    
    user = users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new email OTP
    new_otp = generate_otp()
    
    # Update user with new OTP
    users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "email_otp": new_otp,
                "otp_created_at": datetime.utcnow()
            }
        }
    )
    
    # Send email OTP
    success, message = await send_email_otp(email, new_otp)
    
    response_message = "Email OTP resent successfully"
    if "development" in message.lower():
        response_message += f"\n🚨 DEVELOPMENT MODE: {message}"
    
    return {
        "message": response_message,
        "status": message
    }

@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, current_user: TokenData = Depends(get_current_user)):
    """Get user information (JWT protected)"""
    
    # Users can only access their own information
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = users_collection.find_one({"userid": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        userid=user["userid"],
        username=user["username"],
        full_name=user["full_name"],
        email=user["email"],
        phone_number=user["phone_number"],
        user_type=user["user_type"],
        organization_id=user.get("organization_id"),  # Include organization_id
        email_verified=user["email_verified"],
        created_at=user["created_at"]
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """Get current user information from JWT token"""
    print(f"🔍 DEBUG: /auth/me called for user: {current_user.email} (ID: {current_user.user_id})")
    try:
        user = users_collection.find_one({"userid": current_user.user_id})
        if not user:
            print(f"❌ DEBUG: User not found in database for ID: {current_user.user_id}")
            raise HTTPException(status_code=404, detail="User not found")

        print(f"✅ DEBUG: User found in database")
        print(f"🔍 DEBUG: User document keys: {list(user.keys())}")
        print(f"🔍 DEBUG: User document: {user}")

        # Handle missing username field - use email or full_name as fallback
        username = user.get("username") or user.get("email").split("@")[0] or "user"

        user_response = UserResponse(
            userid=user["userid"],
            username=username,
            full_name=user["full_name"],
            email=user["email"],
            phone_number=user["phone_number"],
            user_type=user["user_type"],
            organization_id=user.get("organization_id"),  # Include organization_id
            email_verified=user["email_verified"],
            created_at=user["created_at"]
        )

        print(f"🎉 DEBUG: Successfully created UserResponse for: {username}")
        return user_response

    except Exception as e:
        print(f"❌ DEBUG: Error in /auth/me: {str(e)}")
        print(f"❌ DEBUG: Error type: {type(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/refresh-token", response_model=Token)
async def refresh_token(current_user: TokenData = Depends(get_current_user)):
    """Refresh JWT token"""
    
    # Verify user still exists and is verified
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="User email not verified")
    
    # Create new JWT token
    access_token = create_access_token(
        data={"sub": user["email"], "user_id": user["userid"]}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=get_token_expiry_time(),
        user_id=user["userid"],
        email=user["email"]
    ) 

@router.post("/user-pii/add")
async def add_user_pii(user_id: int, resource: str, pii_value: str):
    """Add or update a user's PII (encrypt, tokenize, store)"""
    from datetime import datetime
    from routers.pii_tokenizer import (
        tokenize_aadhaar, tokenize_pan, tokenize_account, tokenize_ifsc,
        tokenize_creditcard, tokenize_debitcard, tokenize_gst,
        tokenize_itform16, tokenize_upi, tokenize_passport, tokenize_dl
    )
    
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
    
    # Tokenize
    if resource not in TOKENIZER_MAP:
        return {"error": f"Unsupported resource type: {resource}"}
    
    try:
        token = TOKENIZER_MAP[resource](PIIInput(pii_value=pii_value))["token"]
    except Exception as e:
        return {"error": f"Invalid {resource} format: {str(e)}"}
    
    # Encrypt
    encrypted = encrypt_pii(pii_value)
    entry = {
        "resource": resource,
        "original": encrypted,
        "token": token,
        "created_at": datetime.utcnow()
    }
    
    # Upsert - first ensure user document exists
    user_pii_collection.update_one(
        {"user_id": user_id},
        {"$setOnInsert": {"user_id": user_id, "pii": []}},
        upsert=True
    )
    
    # Then update the specific PII entry
    user_pii_collection.update_one(
        {"user_id": user_id, "pii.resource": resource},
        {"$set": {"pii.$": entry}},
        upsert=False
    )
    
    # If no existing entry was found, add new one
    user_pii_collection.update_one(
        {"user_id": user_id, "pii.resource": {"$ne": resource}},
        {"$push": {"pii": entry}},
        upsert=False
    )
    
    # If no existing entry was found, add new one
    user_pii_collection.update_one(
        {"user_id": user_id, "pii.resource": {"$ne": resource}},
        {"$push": {"pii": entry}},
        upsert=False
    )
    return {"status": "success", "resource": resource, "token": token}

@router.get("/user-pii/{user_id}")
async def get_user_pii(user_id: int):
    """Fetch all PII for a user (admin/internal use)"""
    doc = user_pii_collection.find_one({"user_id": user_id})
    if not doc:
        return {"pii": []}
    # Decrypt originals for internal use
    pii = [
        {**entry, "original": decrypt_pii(entry["original"])}
        for entry in doc.get("pii", [])
    ]
    return {"user_id": user_id, "pii": pii}

class EmailCheckRequest(BaseModel):
    email: EmailStr

@router.post("/check-email")
def check_email(data: EmailCheckRequest):
    user = users_collection.find_one({"email": data.email})
    return {"exists": bool(user)} 

class UpdateOrgIdRequest(BaseModel):
    user_id: int
    organization_id: str

@router.post("/update-organization-id")
async def update_organization_id(data: UpdateOrgIdRequest):
    result = users_collection.update_one(
        {"userid": data.user_id},
        {"$set": {"organization_id": data.organization_id}}
    )
    if result.modified_count == 1:
        return {"status": "success", "message": "Organization ID updated for user."}
    else:
        raise HTTPException(status_code=404, detail="User not found or organization ID not updated.")

@router.put("/update-profile", response_model=ProfileUpdateResponse)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Update user profile information"""
    try:
        # Find the user
        user = users_collection.find_one({"userid": current_user.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare update fields
        update_fields = {}
        updated_fields = []
        
        # Check if email is being updated
        if profile_data.email and profile_data.email != user["email"]:
            # Check if email is already taken
            existing_user = users_collection.find_one({"email": profile_data.email})
            if existing_user and existing_user["userid"] != current_user.user_id:
                raise HTTPException(status_code=400, detail="Email already registered")
            update_fields["email"] = profile_data.email
            updated_fields.append("email")
        
        # Check if username is being updated
        if profile_data.username and profile_data.username != user["username"]:
            # Check if username is already taken
            existing_user = users_collection.find_one({"username": profile_data.username})
            if existing_user and existing_user["userid"] != current_user.user_id:
                raise HTTPException(status_code=400, detail="Username already taken")
            update_fields["username"] = profile_data.username
            updated_fields.append("username")
        
        # Check if full name is being updated
        if profile_data.full_name and profile_data.full_name != user["full_name"]:
            update_fields["full_name"] = profile_data.full_name
            updated_fields.append("full_name")
        
        # If no fields to update, return early
        if not update_fields:
            return ProfileUpdateResponse(
                message="No changes to update",
                updated_fields=[]
            )
        
        # Update the user
        result = users_collection.update_one(
            {"userid": current_user.user_id},
            {"$set": update_fields}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update profile")
        
        return ProfileUpdateResponse(
            message="Profile updated successfully",
            updated_fields=updated_fields
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/update-password")
async def update_password(
    password_data: PasswordUpdateRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Update user password"""
    try:
        # Find the user
        user = users_collection.find_one({"userid": current_user.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(password_data.current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Validate new password strength
        is_strong, message = validate_password_strength(password_data.new_password)
        if not is_strong:
            raise HTTPException(status_code=400, detail=message)
        
        # Hash the new password
        new_password_hash = hash_password(password_data.new_password)
        
        # Update the password
        result = users_collection.update_one(
            {"userid": current_user.user_id},
            {"$set": {"password_hash": new_password_hash}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update password")
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating password: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 

        raise HTTPException(status_code=404, detail="User not found or organization ID not updated.") 

        raise HTTPException(status_code=404, detail="User not found or organization ID not updated.") 

