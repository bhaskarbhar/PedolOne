from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import List
from helpers import logs_collection
from jwt_utils import get_current_user, TokenData

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("/org/{org_id}")
async def get_organization_audit_logs(org_id: str):
    """Get audit logs for an organization (by org_id or org_name)"""
    from helpers import get_organization_by_id
    org = get_organization_by_id(org_id)
    org_name = org["org_name"] if org else org_id

    # Query logs where this org is involved (by id or name)
    logs = list(logs_collection.find({
        "$or": [
            {"fintech_name": org_id},
            {"fintech_name": org_name},
            {"source_org_id": org_id},
            {"source_org_id": org_name},
            {"target_org_id": org_id},
            {"target_org_id": org_name},
        ]
    }).sort("created_at", -1))

    # Format response
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
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
            "created_at": log.get("created_at"),
        })
    return formatted_logs 