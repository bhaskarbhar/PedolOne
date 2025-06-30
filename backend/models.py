from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

# Tokenization
class PIIInput(BaseModel):
    pii_value: str

#Policy Creation
class UserInputPII(BaseModel):
    pii_value: str
    resource: str   # used in /policy/input
    
# User Models for Authentication
class UserRegistration(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)
    user_type: str = Field(default="individual")  # "individual" or "organization"

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
    username: str
    full_name: str
    email: EmailStr
    phone_number: str
    password_hash: str
    user_type: str = "individual"  # "individual" or "organization"
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
    username: str
    full_name: str
    email: str
    phone_number: str
    user_type: str
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

# --- Policy Model ---
class Policy(BaseModel):
    id: Optional[ObjectId] = Field(default=None, alias="_id")
    tokenid: str
    resource_name: str
    purpose: List[str]
    shared_with: str
    contract_id: str
    retention_window: str
    created_at: datetime
    expiry: datetime
    signature: str

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )

# --- User PII Mapping Model ---
class UserPIIEntry(BaseModel):
    resource: str
    original: str  # Fernet-encrypted PII
    token: str     # Tokenized PII
    created_at: datetime

class UserPIIMap(BaseModel):
    user_id: int
    pii: list[UserPIIEntry]
