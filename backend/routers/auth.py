from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from datetime import datetime, timedelta
import bcrypt
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Optional
import asyncio
from bson import ObjectId
from dotenv import load_dotenv

from models import (
    UserRegistration, UserLogin, OTPVerification, LoginVerification, 
    User, Token, TokenData, UserResponse, LoginResponse, RegisterResponse
)
from jwt_utils import create_access_token, get_current_user, get_token_expiry_time

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Database connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URL)
db = client.PedolOne
users_collection = db.users

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# Validate required environment variables
if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    print("WARNING: Email credentials not configured. Email OTP will not work.")

def get_next_user_id() -> int:
    """Get the next incremental user ID"""
    # Find the highest user ID and increment by 1
    latest_user = users_collection.find().sort("userid", -1).limit(1)
    latest_user_list = list(latest_user)
    
    if latest_user_list:
        return latest_user_list[0]["userid"] + 1
    else:
        return 1  # First user gets ID 1

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

async def send_email_otp(email: str, otp: str) -> tuple[bool, str]:
    """Send OTP via email. Returns (success, message)"""
    try:
        # Check if email credentials are configured
        if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
            print(f"Email OTP for {email}: {otp} (Email not configured - using console)")
            return True, f"Email OTP for development: {otp}"  # Return success for development
        
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = email
        msg['Subject'] = "PedolOne - Email Verification OTP"
        
        body = f"""
        Your PedolOne verification OTP is: {otp}
        
        This OTP will expire in 15 minutes.
        If you didn't request this, please ignore this email.
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"Email OTP sent to {email}: {otp}")  # For development
        return True, "Email sent successfully"
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        print(f"Email OTP for {email}: {otp} (Fallback - check console)")
        return True, f"Email failed, but OTP for development: {otp}"  # Return success for development



async def cleanup_unverified_users():
    """Background task to cleanup unverified users after 15 minutes"""
    while True:
        try:
            # Delete users who registered more than 15 minutes ago and are not email verified
            cutoff_time = datetime.utcnow() - timedelta(minutes=15)
            
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
    
    # Check if user already exists
    existing_user = users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Generate email OTP
    email_otp = generate_otp()
    
    # Get next user ID
    user_id = get_next_user_id()
    
    # Create user document
    user_doc = {
        "userid": user_id,
        "email": user_data.email,
        "password_hash": password_hash,
        "email_verified": False,
        "created_at": datetime.utcnow(),
        "email_otp": email_otp,
        "otp_created_at": datetime.utcnow()
    }
    
    # Insert user into database
    result = users_collection.insert_one(user_doc)
    
    # Send email OTP
    email_success, email_message = await send_email_otp(user_data.email, email_otp)
    
    # Prepare response message
    response_message = "User registered successfully. Please verify your email address."
    
    # Add development message if email credentials are not configured
    if "development" in email_message.lower():
        response_message += f"\n\n🚨 DEVELOPMENT MODE: Check console for OTP:\n📧 {email_message}"
    
    return RegisterResponse(
        message=response_message,
        user_id=user_id,
        email_status=email_message
    )

@router.post("/verify-otp")
async def verify_otp(verification_data: OTPVerification):
    """Verify email OTP"""
    
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
        email=user["email"],
        email_verified=user["email_verified"],
        created_at=user["created_at"]
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """Get current user information from JWT token"""
    
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        userid=user["userid"],
        email=user["email"],
        email_verified=user["email_verified"],
        created_at=user["created_at"]
    )

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