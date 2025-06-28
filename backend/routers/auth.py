from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import bcrypt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Optional
import asyncio
from dotenv import load_dotenv
import secrets
import uuid
from fastapi.responses import RedirectResponse

from models import (
    UserRegistration, UserLogin, OTPVerification, LoginVerification, 
    User, Token, TokenData, UserResponse, LoginResponse, RegisterResponse
)
from jwt_utils import create_access_token, get_current_user, get_token_expiry_time
from helpers import users_collection

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
        "email_verified": False,
        "created_at": datetime.utcnow(),
        "verification_token": verification_token,
        "token_created_at": datetime.utcnow()
    }
    
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
async def login_user(login_data: UserLogin):
    """Login user and initiate verification"""
    
    user = users_collection.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(login_data.password, user["password_hash"]):
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
async def verify_login(verification_data: LoginVerification):
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