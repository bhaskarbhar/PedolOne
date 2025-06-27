import hashlib
import uuid
import re
from datetime import datetime, timedelta
import hmac
import base64
from typing import Optional
import os
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