from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class PIIInput(BaseModel):
    pii_value: str

# User Models for Authentication
class UserRegistration(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPVerification(BaseModel):
    email: EmailStr
    otp: str

class LoginVerification(BaseModel):
    email: EmailStr
    otp: str

class User(BaseModel):
    userid: Optional[int] = None
    email: EmailStr
    password_hash: str
    email_verified: bool = False
    created_at: Optional[datetime] = None
    email_otp: Optional[str] = None
    otp_created_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            ObjectId: str
        }

# JWT Token Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: int
    email: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# Response Models
class UserResponse(BaseModel):
    userid: int
    email: str
    email_verified: bool
    created_at: datetime

class LoginResponse(BaseModel):
    message: str
    requires_verification: bool
    user_id: int
    email_status: str

class RegisterResponse(BaseModel):
    message: str
    user_id: int
    email_status: str
