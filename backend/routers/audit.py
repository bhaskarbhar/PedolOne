from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import List, Optional
from helpers import logs_collection
from jwt_utils import get_current_user, TokenData
import re

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/org/{org_id}")
async def get_organization_audit_logs(
    org_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    log_type: Optional[str] = Query(None, description="Filter by log type"),
    data_source: Optional[str] = Query(None, description="Filter by data source"),
    search: Optional[str] = Query(None, description="Search term for fintech name, resource, purpose, or IP"),
    limit: Optional[int] = Query(100, description="Maximum number of logs to return"),
    offset: Optional[int] = Query(0, description="Number of logs to skip"),
    current_user: TokenData = Depends(get_current_user)
):
    """Get audit logs for an organization with filtering capabilities"""
    from helpers import get_organization_by_id, users_collection
    
    # Verify user has access to this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    # Check if user is from the requested organization
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this organization's audit logs")
    
    org = get_organization_by_id(org_id)
    org_name = org["org_name"] if org else org_id

    # Build query filter
    query_filter = {
        "$or": [
            {"fintech_name": org_id},
            {"fintech_name": org_name},
            {"source_org_id": org_id},
            {"source_org_id": org_name},
            {"target_org_id": org_id},
            {"target_org_id": org_name},
        ]
    }

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

    # Add log type filter
    if log_type:
        query_filter["log_type"] = log_type

    # Add data source filter
    if data_source:
        query_filter["data_source"] = data_source

    # Add search filter
    if search:
        search_regex = re.compile(search, re.IGNORECASE)
        query_filter["$or"] = [
            {"fintech_name": search_regex},
            {"resource_name": search_regex},
            {"purpose": search_regex},
            {"ip_address": search_regex},
            {"region": search_regex},
            {"city": search_regex},
            {"country": search_regex}
        ]

    # Execute query with pagination
    logs = list(logs_collection.find(query_filter).sort("created_at", -1).skip(offset).limit(limit))

    # Get total count for pagination
    total_count = logs_collection.count_documents(query_filter)

    # Format response
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": str(log.get("_id")),
            "user_id": log.get("user_id"),
            "fintech_name": log.get("fintech_name"),
            "resource_name": log.get("resource_name"),
            "purpose": log.get("purpose"),
            "log_type": log.get("log_type"),
            "ip_address": log.get("ip_address"),
            "region": log.get("region", "Unknown Location"),
            "country": log.get("country", ""),
            "city": log.get("city", ""),
            "data_source": log.get("data_source"),
            "created_at": log.get("created_at").isoformat() if log.get("created_at") else None,
            "date": log.get("created_at").strftime("%Y-%m-%d %H:%M:%S") if log.get("created_at") else None,
            "type": log.get("log_type"),
            "dataSource": log.get("data_source"),
            "dataAccessed": log.get("resource_name", "").replace("_", " ").title(),
            "ipAddress": log.get("ip_address"),
            "region": log.get("region", "Unknown Location")
        })

    return {
        "logs": formatted_logs,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "has_more": total_count > offset + limit
    }

@router.get("/org/{org_id}/summary")
async def get_audit_summary(
    org_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: TokenData = Depends(get_current_user)
):
    """Get audit summary statistics for an organization"""
    from helpers import get_organization_by_id, users_collection
    
    # Verify user has access to this organization
    user = users_collection.find_one({"userid": current_user.user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    
    # Check if user is from the requested organization
    if user.get("user_type") == "organization" and user.get("organization_id") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this organization's audit logs")
    
    org = get_organization_by_id(org_id)
    org_name = org["org_name"] if org else org_id

    # Build query filter
    query_filter = {
        "$or": [
            {"fintech_name": org_id},
            {"fintech_name": org_name},
            {"source_org_id": org_id},
            {"source_org_id": org_name},
            {"target_org_id": org_id},
            {"target_org_id": org_name},
        ]
    }

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

    # Get summary statistics
    pipeline = [
        {"$match": query_filter},
        {
            "$group": {
                "_id": None,
                "total_logs": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"},
                "unique_ips": {"$addToSet": "$ip_address"},
                "log_types": {"$addToSet": "$log_type"},
                "data_sources": {"$addToSet": "$data_source"}
            }
        },
        {
            "$project": {
                "total_logs": 1,
                "unique_users": {"$size": "$unique_users"},
                "unique_ips": {"$size": "$unique_ips"},
                "log_types": 1,
                "data_sources": 1
            }
        }
    ]

    summary_result = list(logs_collection.aggregate(pipeline))
    
    if not summary_result:
        summary = {
            "total_logs": 0,
            "unique_users": 0,
            "unique_ips": 0,
            "log_types": [],
            "data_sources": []
        }
    else:
        summary = summary_result[0]

    # Get log type distribution
    log_type_pipeline = [
        {"$match": query_filter},
        {"$group": {"_id": "$log_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    log_type_distribution = list(logs_collection.aggregate(log_type_pipeline))

    # Get recent activity (last 7 days)
    recent_filter = query_filter.copy()
    recent_filter["created_at"] = {"$gte": datetime.utcnow() - timedelta(days=7)}
    recent_activity = logs_collection.count_documents(recent_filter)

    return {
        "summary": {
            "total_logs": summary.get("total_logs", 0),
            "unique_users": summary.get("unique_users", 0),
            "unique_ips": summary.get("unique_ips", 0),
            "recent_activity_7_days": recent_activity,
            "log_types": summary.get("log_types", []),
            "data_sources": summary.get("data_sources", [])
        },
        "log_type_distribution": [
            {"log_type": item["_id"], "count": item["count"]} 
            for item in log_type_distribution
        ]
    } 