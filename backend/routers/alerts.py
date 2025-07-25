from fastapi import APIRouter, Depends, HTTPException, Query, Request
from datetime import datetime, timedelta
from typing import List, Optional
from jwt_utils import get_current_user, TokenData
from helpers import (
    users_collection, 
    organizations_collection, 
    logs_collection,
    alerts_collection,
    get_organization_by_id,
    get_client_ip
)
import httpx
import asyncio
from bson import ObjectId

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# Alert types
ALERT_TYPES = {
    "failed_login": "Failed Login Attempt",
    "multiple_requests": "Multiple Data Requests",
    "foreign_access": "Foreign Access Attempt",
    "suspicious_activity": "Suspicious Activity",
    "data_breach": "Potential Data Breach",
    "unusual_pattern": "Unusual Access Pattern"
}

async def get_location_from_ip(ip_address: str) -> dict:
    """Get location information from IP address"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "country": data.get("country", "Unknown"),
                    "region": data.get("regionName", "Unknown"),
                    "city": data.get("city", "Unknown"),
                    "timezone": data.get("timezone", "Unknown")
                }
    except Exception as e:
        print(f"Error getting location for IP {ip_address}: {e}")
    
    return {
        "country": "Unknown",
        "region": "Unknown", 
        "city": "Unknown",
        "timezone": "Unknown"
    }

async def create_alert(
    org_id: str,
    alert_type: str,
    severity: str,
    description: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    additional_data: Optional[dict] = None
):
    """Create a new alert"""
    location_data = await get_location_from_ip(ip_address) if ip_address else {}
    
    alert_data = {
        "org_id": org_id,
        "alert_type": alert_type,
        "severity": severity,  # low, medium, high, critical
        "description": description,
        "user_id": user_id,
        "ip_address": ip_address,
        "location": location_data,
        "additional_data": additional_data or {},
        "is_read": False,
        "created_at": datetime.utcnow(),
        "resolved_at": None,
        "resolved_by": None
    }
    
    alerts_collection.insert_one(alert_data)
    print(f"🚨 Alert created: {alert_type} for org {org_id}")

async def check_failed_login_attempts(org_id: str, user_id: int, ip_address: str):
    """Check for failed login attempts and create alerts"""
    # Check failed logins in the last 2 minutes
    two_minutes_ago = datetime.utcnow() - timedelta(minutes=2)
    
    failed_logins = logs_collection.count_documents({
        "user_id": user_id,
        "log_type": "login_failed",
        "created_at": {"$gte": two_minutes_ago}
    })
    
    if failed_logins >= 3:
        await create_alert(
            org_id=org_id,
            alert_type="failed_login",
            severity="high",
            description=f"Multiple failed login attempts detected for user {user_id}",
            user_id=user_id,
            ip_address=ip_address,
            additional_data={
                "failed_attempts": failed_logins,
                "time_window": "2 minutes"
            }
        )

async def check_multiple_data_requests(org_id: str, user_id: int, ip_address: str):
    """Check for multiple data requests in short time"""
    # Check data requests in the last 5 minutes
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
    
    data_requests = logs_collection.count_documents({
        "user_id": user_id,
        "log_type": {"$in": ["data_request_sent", "bulk_request_sent"]},
        "created_at": {"$gte": five_minutes_ago}
    })
    
    if data_requests >= 5:
        await create_alert(
            org_id=org_id,
            alert_type="multiple_requests",
            severity="medium",
            description=f"Multiple data requests detected from user {user_id}",
            user_id=user_id,
            ip_address=ip_address,
            additional_data={
                "request_count": data_requests,
                "time_window": "5 minutes"
            }
        )

async def check_foreign_access(org_id: str, user_id: int, ip_address: str):
    """Check if access is from outside India"""
    # Skip local IP addresses
    if is_local_ip(ip_address):
        return
    
    location_data = await get_location_from_ip(ip_address)
    
    if location_data.get("country") != "India":
        await create_alert(
            org_id=org_id,
            alert_type="foreign_access",
            severity="high",
            description=f"Access attempt from foreign location: {location_data.get('country')}",
            user_id=user_id,
            ip_address=ip_address,
            additional_data={
                "country": location_data.get("country"),
                "city": location_data.get("city"),
                "region": location_data.get("region")
            }
        )

def is_local_ip(ip_address: str) -> bool:
    """Check if IP address is local/private"""
    if not ip_address:
        return True
    
    # Common local/private IP ranges
    local_ranges = [
        "127.",      # localhost
        "10.",       # private network
        "192.168.",  # private network
        "172.16.",   # private network
        "172.17.",   # private network
        "172.18.",   # private network
        "172.19.",   # private network
        "172.20.",   # private network
        "172.21.",   # private network
        "172.22.",   # private network
        "172.23.",   # private network
        "172.24.",   # private network
        "172.25.",   # private network
        "172.26.",   # private network
        "172.27.",   # private network
        "172.28.",   # private network
        "172.29.",   # private network
        "172.30.",   # private network
        "172.31.",   # private network
        "169.254.",  # link-local
        "::1",       # IPv6 localhost
        "fe80:",     # IPv6 link-local
    ]
    
    for local_range in local_ranges:
        if ip_address.startswith(local_range):
            return True
    
    return False

@router.post("/check-suspicious-activity")
async def check_suspicious_activity(
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Check for suspicious activity and create alerts"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    org_id = user.get("organization_id")
    ip_address = get_client_ip(request)
    
    # Run all checks concurrently
    await asyncio.gather(
        check_failed_login_attempts(org_id, current_user.user_id, ip_address),
        check_multiple_data_requests(org_id, current_user.user_id, ip_address),
        check_foreign_access(org_id, current_user.user_id, ip_address)
    )
    
    return {"message": "Suspicious activity check completed"}

@router.get("/org/{org_id}")
async def get_organization_alerts(
    org_id: str,
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: Optional[int] = Query(50, description="Maximum number of alerts to return"),
    offset: Optional[int] = Query(0, description="Number of alerts to skip"),
    current_user: TokenData = Depends(get_current_user)
):
    """Get alerts for an organization with filtering and pagination"""
    # Verify user has access to this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    # Check if user is from the requested organization
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this organization's alerts")
    
    # Build query filter
    query_filter = {"org_id": org_id}

    # Add alert type filter
    if alert_type:
        query_filter["alert_type"] = alert_type

    # Add severity filter
    if severity:
        query_filter["severity"] = severity

    # Add read status filter
    if is_read is not None:
        query_filter["is_read"] = is_read

    # Add date range filter
    if start_date or end_date:
        date_filter = {}
        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                date_filter["$gte"] = start_datetime
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
        
        if end_date:
            try:
                end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                date_filter["$lt"] = end_datetime
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
        
        query_filter["created_at"] = date_filter

    # Execute query with pagination
    alerts = list(alerts_collection.find(query_filter).sort("created_at", -1).skip(offset).limit(limit))

    # Get total count for pagination
    total_count = alerts_collection.count_documents(query_filter)

    # Format response
    formatted_alerts = []
    for alert in alerts:
        formatted_alerts.append({
            "id": str(alert.get("_id")),
            "alert_type": alert.get("alert_type"),
            "alert_type_display": ALERT_TYPES.get(alert.get("alert_type"), alert.get("alert_type")),
            "severity": alert.get("severity"),
            "description": alert.get("description"),
            "user_id": alert.get("user_id"),
            "ip_address": alert.get("ip_address"),
            "location": alert.get("location", {}),
            "additional_data": alert.get("additional_data", {}),
            "is_read": alert.get("is_read", False),
            "created_at": alert.get("created_at"),
            "resolved_at": alert.get("resolved_at"),
            "resolved_by": alert.get("resolved_by")
        })

    return {
        "alerts": formatted_alerts,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total_count
    }

@router.get("/org/{org_id}/unread-count")
async def get_unread_alerts_count(
    org_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Get count of unread alerts for an organization"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    count = alerts_collection.count_documents({
        "org_id": org_id,
        "is_read": False
    })
    
    return {"unread_count": count}

@router.put("/{alert_id}/mark-read")
async def mark_alert_as_read(
    alert_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Mark an alert as read"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    # Get the alert
    try:
        alert = alerts_collection.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Check if user has access to this alert
        if user.get("user_type") == "organization" and user.get("organization_id") != alert.get("org_id"):
            raise HTTPException(status_code=403, detail="Access denied to this alert")
        
        # Update the alert
        alerts_collection.update_one(
            {"_id": ObjectId(alert_id)},
            {
                "$set": {
                    "is_read": True,
                    "resolved_at": datetime.utcnow(),
                    "resolved_by": current_user.user_id
                }
            }
        )
    except Exception as e:
        if "invalid ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="Invalid alert ID format")
        raise HTTPException(status_code=500, detail="Error updating alert")
    
    return {"message": "Alert marked as read"}

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Delete an alert"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    try:
        # Get the alert
        alert = alerts_collection.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Check if user has access to this alert
        if user.get("user_type") == "organization" and user.get("organization_id") != alert.get("org_id"):
            raise HTTPException(status_code=403, detail="Access denied to this alert")
        
        # Delete the alert
        alerts_collection.delete_one({"_id": ObjectId(alert_id)})
        
        return {"message": "Alert deleted successfully"}
        
    except Exception as e:
        if "invalid ObjectId" in str(e):
            raise HTTPException(status_code=400, detail="Invalid alert ID format")
        raise HTTPException(status_code=500, detail="Error deleting alert")

@router.put("/org/{org_id}/mark-all-read")
async def mark_all_alerts_as_read(
    org_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Mark all alerts for an organization as read"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update all unread alerts
    result = alerts_collection.update_many(
        {
            "org_id": org_id,
            "is_read": False
        },
        {
            "$set": {
                "is_read": True,
                "resolved_at": datetime.utcnow(),
                "resolved_by": current_user.user_id
            }
        }
    )
    
    return {
        "message": f"Marked {result.modified_count} alerts as read",
        "modified_count": result.modified_count
    }

@router.get("/types")
async def get_alert_types():
    """Get all available alert types"""
    return {"alert_types": ALERT_TYPES}

@router.post("/block-ip")
async def block_ip_address(
    request: Request,
    current_user: TokenData = Depends(get_current_user)
):
    """Block an IP address"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    # Only organization admins can block IPs
    if user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can block IP addresses")
    
    # Get request body
    try:
        body = await request.json()
        ip_address = body.get("ip_address")
        if not ip_address:
            raise HTTPException(status_code=400, detail="IP address is required")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    # Add IP to blocked list in organization settings
    org_id = user.get("organization_id")
    
    # Get current blocked IPs
    org = organizations_collection.find_one({"_id": org_id})
    blocked_ips = org.get("blocked_ips", []) if org else []
    
    # Add IP if not already blocked
    if ip_address not in blocked_ips:
        blocked_ips.append(ip_address)
        
        # Update organization
        organizations_collection.update_one(
            {"_id": org_id},
            {"$set": {"blocked_ips": blocked_ips}}
        )
        
        # Create an alert for IP blocking
        await create_alert(
            org_id=org_id,
            alert_type="suspicious_activity",
            severity="high",
            description=f"IP address {ip_address} has been blocked by admin",
            user_id=current_user.user_id,
            ip_address=ip_address,
            additional_data={
                "action": "ip_blocked",
                "blocked_by": current_user.user_id,
                "blocked_at": datetime.utcnow().isoformat()
            }
        )
        
        print(f"🚫 IP {ip_address} blocked for org {org_id}")
    
    return {
        "message": f"IP address {ip_address} has been blocked",
        "blocked_ips": blocked_ips
    }

@router.get("/blocked-ips")
async def get_blocked_ips(
    current_user: TokenData = Depends(get_current_user)
):
    """Get list of blocked IP addresses for the organization"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    if user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can view blocked IPs")
    
    org_id = user.get("organization_id")
    org = organizations_collection.find_one({"_id": org_id})
    
    blocked_ips = org.get("blocked_ips", []) if org else []
    
    return {"blocked_ips": blocked_ips}

@router.delete("/unblock-ip/{ip_address}")
async def unblock_ip_address(
    ip_address: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Unblock an IP address"""
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    if user.get("user_type") != "organization":
        raise HTTPException(status_code=403, detail="Only organization users can unblock IP addresses")
    
    org_id = user.get("organization_id")
    
    # Get current blocked IPs
    org = organizations_collection.find_one({"_id": org_id})
    blocked_ips = org.get("blocked_ips", []) if org else []
    
    # Remove IP if it's in the blocked list
    if ip_address in blocked_ips:
        blocked_ips.remove(ip_address)
        
        # Update organization
        organizations_collection.update_one(
            {"_id": org_id},
            {"$set": {"blocked_ips": blocked_ips}}
        )
        
        print(f"✅ IP {ip_address} unblocked for org {org_id}")
    
    return {
        "message": f"IP address {ip_address} has been unblocked",
        "blocked_ips": blocked_ips
    } 