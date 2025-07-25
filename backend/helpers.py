from dotenv import load_dotenv
load_dotenv()

import hashlib
import uuid
import re
from datetime import datetime, timedelta
import hmac
import base64
from typing import Optional
import os
from pymongo import MongoClient
from cryptography.fernet import Fernet

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URL)
db = client.PedolOne
users_collection = db.users
user_pii_collection = db.user_pii

# Organization collections
organizations_collection = db.organizations
policies_collection = db.policy
logs_collection = db.logs
alerts_collection = db.alerts
inter_org_contracts_collection = db.inter_org_contracts

FERNET_KEY = os.getenv("FERNET_KEY")
if not FERNET_KEY:
    raise Exception("FERNET_KEY not set in environment variables")
fernet = Fernet(FERNET_KEY)

def token_sha3(data: str) -> str:
    return hashlib.sha3_256(data.encode()).hexdigest()

def token_blake2(data: str) -> str:
    return hashlib.blake2b(data.encode(), digest_size=20).hexdigest()

def token_uuid5(data: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, data))

def token_permuted(data: str, seed: int = 7) -> str:
    return token_sha3("".join(reversed(data)) + str(seed))

# Authentication helper functions
def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone_number(phone: str) -> bool:
    """Validate phone number format (basic validation)"""
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    # Check if it's between 10-15 digits
    return 10 <= len(digits_only) <= 15

def format_phone_number(phone: str) -> str:
    """Format phone number for international use"""
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    
    # Add country code if not present (assuming India +91)
    if len(digits_only) == 10:
        return f"+91{digits_only}"
    elif len(digits_only) == 12 and digits_only.startswith("91"):
        return f"+{digits_only}"
    elif digits_only.startswith("+"):
        return phone
    else:
        return f"+{digits_only}"

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"

def parse_retention_window(retention: str) -> int:
    """Parse retention like '30 days' into number of days"""
    match = re.match(r'(\d+)\s*days?', retention.lower())
    return int(match.group(1)) if match else 0

def calculate_expiry(created_at: datetime, retention: str) -> datetime:
    """Calculate expiry datetime based on retention window"""
    days = parse_retention_window(retention)
    return created_at + timedelta(days=days)

def generate_policy_signature(data: str, secret_key: Optional[str] = None) -> str:
    """Generate HMAC-SHA256 signature for policy"""
    if not secret_key:
        secret_key = os.getenv("POLICY_SECRET_KEY")
    signature = hmac.new(secret_key.encode(), data.encode(), hashlib.sha256).digest()
    return base64.b64encode(signature).decode()

def encrypt_pii(plain: str) -> str:
    return fernet.encrypt(plain.encode()).decode()

def decrypt_pii(token: str) -> str:
    return fernet.decrypt(token.encode()).decode()

def seed_organizations():
    """Seed the database with 3 sample organizations"""
    sample_organizations = [
        {
            "org_id": "stockbrokerx_001",
            "org_name": "StockBrokerX",
            "contract_id": "contract_stockbroker_2025",
            "created_at": datetime.utcnow()
        },
        {
            "org_id": "bankabc_001",
            "org_name": "BankABC", 
            "contract_id": "contract_bankabc_2025",
            "created_at": datetime.utcnow()
        },
        {
            "org_id": "insurancecorp_001",
            "org_name": "InsuranceCorp",
            "contract_id": "contract_insurance_2025", 
            "created_at": datetime.utcnow()
        }
    ]
    
    for org in sample_organizations:
        # Check if organization already exists
        existing = organizations_collection.find_one({"org_id": org["org_id"]})
        if not existing:
            organizations_collection.insert_one(org)
            print(f"Seeded organization: {org['org_name']}")

def get_organization_by_id(org_id: str):
    """Get organization by ID"""
    return organizations_collection.find_one({"org_id": org_id})

def get_organization_clients(org_id: str):
    """Get all users who have shared data with this organization (through policies)"""
    # Get all policies where this org is the target
    policies = list(policies_collection.find({"target_org_id": org_id}))
    
    # Get unique user IDs from these policies
    user_ids = list(set([policy["user_id"] for policy in policies]))
    
    # Get user details
    clients = []
    for user_id in user_ids:
        user = users_collection.find_one({"userid": user_id})
        if user:
            clients.append({
                "userid": user["userid"],
                "username": user["username"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone_number": user["phone_number"],
                "created_at": user["created_at"]
            })
    
    return clients

async def enrich_audit_log_with_location(log_data: dict, ip_address: str = None) -> dict:
    """
    Enrich audit log data with geolocation information
    
    Args:
        log_data: The audit log data dictionary
        ip_address: The IP address to resolve
        
    Returns:
        Enriched log data with location information
    """
    if not ip_address:
        return log_data
        
    try:
        from services.geolocation import geolocation_service
        location_data = await geolocation_service.get_location_from_ip(ip_address)
        
        if location_data:
            log_data["region"] = geolocation_service.get_region_display_name(location_data)
            log_data["country"] = location_data.get("country", "")
            log_data["city"] = location_data.get("city", "")
        else:
            log_data["region"] = "Unknown Location"
            log_data["country"] = ""
            log_data["city"] = ""
            
    except Exception as e:
        # Log error but don't fail the audit log creation
        print(f"Error enriching audit log with location: {e}")
        log_data["region"] = "Unknown Location"
        log_data["country"] = ""
        log_data["city"] = ""
        
    return log_data

def get_client_ip(request) -> str:
    """
    Extract client IP from FastAPI request
    
    Args:
        request: FastAPI request object
        
    Returns:
        Client IP address as string
    """
    if not request:
        return "unknown"
        
    # Check for forwarded headers first
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
        
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
        
    # Fall back to client host
    if request.client:
        return request.client.host
        
    return "unknown"

async def create_audit_log(log_data: dict, ip_address: str = None) -> None:
    """
    Create an audit log entry with geolocation information
    
    Args:
        log_data: The audit log data dictionary
        ip_address: The IP address to resolve for location
    """
    try:
        # Enrich with geolocation data
        enriched_log_data = await enrich_audit_log_with_location(log_data, ip_address)
        
        # Insert into database
        logs_collection.insert_one(enriched_log_data)
        
    except Exception as e:
        # Log error but don't fail the operation
        print(f"Error creating audit log: {e}")
        # Fallback: insert without geolocation data
        logs_collection.insert_one(log_data)

def get_database():
    """Get the database instance"""
    return db