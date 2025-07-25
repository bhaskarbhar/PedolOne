from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv
from models import TokenData

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception):
    """Verify JWT token and extract user data"""
    try:
        print(f"DEBUG: Verifying token: {token[:20]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"DEBUG: Token payload: {payload}")
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        
        print(f"DEBUG: Extracted email: {email}, user_id: {user_id}")
        
        if email is None or user_id is None:
            print(f"DEBUG: Missing email or user_id in token")
            raise credentials_exception
            
        token_data = TokenData(email=email, user_id=user_id)
        print(f"DEBUG: Created TokenData: {token_data}")
        return token_data
        
    except jwt.PyJWTError as e:
        print(f"DEBUG: JWT decode error: {e}")
        raise credentials_exception

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current user from JWT token"""
    print(f"DEBUG: get_current_user called")
    print(f"DEBUG: credentials: {credentials}")
    print(f"DEBUG: credentials.credentials: {credentials.credentials[:20] if credentials.credentials else 'None'}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    return verify_token(token, credentials_exception)

def get_token_expiry_time():
    """Get token expiry time in seconds"""
    return ACCESS_TOKEN_EXPIRE_HOURS * 3600 