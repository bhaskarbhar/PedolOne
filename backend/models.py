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
    organization_id: Optional[str] = None  # For organization admins

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
    organization_id: Optional[str] = None  # For organization admins
    email_verified: bool = False
    created_at: Optional[datetime] = None
    email_otp: Optional[str] = None
    otp_created_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )

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
    organization_id: Optional[str] = None
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

# --- Organization Models ---
class Organization(BaseModel):
    org_id: str
    org_name: str
    contract_id: str
    created_at: datetime

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )

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
    user_id: int  # User who owns the data
    source_org_id: Optional[str] = None  # Organization that originally received the data
    target_org_id: Optional[str] = None  # Organization that data is shared with

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

# --- Audit Log Model ---
class LogEntry(BaseModel):
    id: Optional[ObjectId] = Field(default=None, alias="_id")
    user_id: int
    fintech_name: str
    fintech_id: Optional[str] = None
    resource_name: str
    purpose: list[str]
    log_type: str = "consent"  # "consent" or "data_access"
    ip_address: Optional[str] = None
    data_source: str = "individual"  # "individual" or "organization"
    source_org_id: Optional[str] = None  # For inter-org sharing
    target_org_id: Optional[str] = None  # For inter-org sharing
    created_at: datetime

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )

class UserAccessLog(BaseModel):
    user_id: int
    logs: list[LogEntry]

# --- Data Access Request Models ---
class DataAccessRequest(BaseModel):
    id: Optional[ObjectId] = Field(default=None, alias="_id")
    request_id: str
    requester_org_id: str
    requester_org_name: str
    target_user_id: int
    target_user_email: str
    target_org_id: Optional[str] = None
    target_org_name: Optional[str] = None
    requested_resources: List[str]  # List of PII types requested
    purpose: List[str]
    retention_window: str
    status: str = "pending"  # "pending", "approved", "rejected", "expired"
    request_message: Optional[str] = None
    response_message: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    responded_at: Optional[datetime] = None
    responded_by: Optional[int] = None  # User ID who responded

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )

class CreateDataRequest(BaseModel):
    target_user_email: str
    requested_resources: List[str]
    purpose: List[str]
    retention_window: str = "30 days"
    request_message: Optional[str] = None

class RespondToRequest(BaseModel):
    request_id: str
    status: str  # "approved" or "rejected"
    response_message: Optional[str] = None

# --- Inter-Organization Contract Models ---
class ContractResource(BaseModel):
    resource_name: str
    purpose: List[str]
    retention_window: str
    created_at: datetime
    ends_at: datetime
    signature: str

class InterOrgContract(BaseModel):
    id: Optional[ObjectId] = Field(default=None, alias="_id")
    contract_id: str
    contract_name: str  # Human-readable name for the contract
    contract_type: str  # "data_sharing", "file_sharing", "service_integration", etc.
    contract_description: Optional[str] = None  # Detailed description of the contract
    source_org_id: str
    source_org_name: str
    target_org_id: str
    target_org_name: str
    created_at: datetime
    ends_at: datetime
    resources_allowed: List[ContractResource]
    status: str = "active"  # "active", "expired", "terminated", "pending_approval", "rejected"
    # Approval workflow fields
    approval_status: str = "pending"  # "pending", "approved", "rejected"
    approval_message: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None  # User ID who approved
    # Contract update fields
    is_update: bool = False
    original_contract_id: Optional[str] = None  # For contract updates
    update_reason: Optional[str] = None
    # Contract versioning
    version: str = "1.0"  # Contract version
    parent_contract_id: Optional[str] = None  # For contract renewals/updates

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )

class CreateInterOrgContract(BaseModel):
    target_org_id: str
    contract_name: str
    contract_type: str = "data_sharing"
    contract_description: Optional[str] = None
    resources_allowed: List[ContractResource]
    approval_message: Optional[str] = None
    ends_at: Optional[datetime] = None  # Optional custom end date

class UpdateInterOrgContract(BaseModel):
    contract_id: str
    contract_name: Optional[str] = None
    contract_description: Optional[str] = None
    resources_allowed: Optional[List[ContractResource]] = None
    update_reason: str
    ends_at: Optional[datetime] = None

class RespondToContract(BaseModel):
    contract_id: str
    status: str  # "approved" or "rejected"
    response_message: Optional[str] = None

class ContractSummary(BaseModel):
    contract_id: str
    contract_name: str
    contract_type: str
    source_org_name: str
    target_org_name: str
    status: str
    approval_status: str
    created_at: datetime
    ends_at: datetime
    resource_count: int
    is_requester: bool  # Whether the current org is the requester

class ContractTypeInfo(BaseModel):
    type_id: str
    name: str
    description: str
    allowed_resources: List[str]
    default_retention: str

# --- Organization User Management Models ---
class OrgUserSummary(BaseModel):
    user_id: int
    username: str
    full_name: str
    email: str
    phone_number: str
    shared_resources: List[str]
    active_policies_count: int
    last_consent_date: Optional[datetime] = None
    total_data_access_count: int

class OrgUserDetail(BaseModel):
    user_id: int
    username: str
    full_name: str
    email: str
    phone_number: str
    shared_resources: List[str]
    policies: List[dict]
    pii_data: List[dict]
    consent_history: List[dict]

# --- Contract Management Models ---
class ContractUpdateRequest(BaseModel):
    contract_id: str
    contract_name: Optional[str] = None
    contract_description: Optional[str] = None
    contract_type: Optional[str] = None
    resources_allowed: Optional[List[ContractResource]] = None
    approval_message: Optional[str] = None
    version: Optional[str] = None

class ContractDeletionRequest(BaseModel):
    contract_id: str
    deletion_reason: str
    approval_message: Optional[str] = None

class ContractActionRequest(BaseModel):
    contract_id: str
    action_type: str  # "update", "delete", "renew", "suspend"
    status: str  # "approved", "rejected"
    response_message: Optional[str] = None

class ContractVersion(BaseModel):
    id: Optional[ObjectId] = Field(default=None, alias="_id")
    version_id: str
    version_number: str
    contract_id: str
    contract_name: str
    contract_description: Optional[str] = None
    contract_type: str
    resources_allowed: List[ContractResource]
    created_at: datetime
    created_by: int
    parent_version_id: Optional[str] = None
    change_summary: Optional[str] = None
    approval_status: str = "pending"  # "pending", "approved", "rejected"
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )

class ContractAuditLog(BaseModel):
    id: Optional[ObjectId] = Field(default=None, alias="_id")
    contract_id: str
    action_type: str  # "created", "updated", "deleted", "approved", "rejected", "suspended", "renewed"
    action_by: int
    action_by_org_id: str
    action_details: dict
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        json_encoders={ObjectId: str}
    )
