from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
from datetime import datetime
from pymongo import MongoClient

router = APIRouter()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        # user_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    # Remove failed connections
                    self.disconnect(connection, user_id)

manager = ConnectionManager()

# MongoDB client and collection
client = MongoClient("mongodb://localhost:27017/")
db = client["PedolOne"]
logs_collection = db["logs"]

@router.websocket("/ws/user/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep the connection alive and wait for messages
            data = await websocket.receive_text()
            # We don't process incoming messages in this implementation
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Function to be called from other routers to send updates
async def send_user_update(user_id: str, update_type: str, data: dict):
    message = {
        "type": update_type,
        **data
    }
    await manager.broadcast_to_user(user_id, message)

@router.get("/audit/org/{org_id}")
async def get_organization_audit_logs(org_id: str):
    """Get all audit logs for an organization"""
    # Get logs where this org is the source or target
    logs = list(logs_collection.find({
        "$or": [
            {"source_org_id": org_id},
            {"target_org_id": org_id}
        ]
    }))

    # Sort by created_at (newest first)
    logs.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)

    # Format response
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "user_id": log["user_id"],
            "fintech_name": log["fintech_name"],
            "resource_name": log["resource_name"],
            "purpose": log["purpose"],
            "log_type": log["log_type"],
            "ip_address": log.get("ip_address"),
            "data_source": log["data_source"],
            "source_org_id": log.get("source_org_id"),
            "target_org_id": log.get("target_org_id"),
            "created_at": log["created_at"].isoformat()
        })

    return formatted_logs 