from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
from datetime import datetime
from pymongo import MongoClient
from jwt_utils import verify_token
import jwt
from dotenv import load_dotenv
import os
load_dotenv()
router = APIRouter()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
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
client = MongoClient(MONGO_URL)
db = client["PedolOne"]
logs_collection = db["logs"]

@router.websocket("/ws/user/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    # Extract token from query params
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401, reason="Missing token")
        return
    credentials_exception = Exception("Could not validate credentials")
    try:
        token_data = verify_token(token, credentials_exception)
    except jwt.PyJWTError:
        await websocket.close(code=4401, reason="Invalid token")
        return
    except Exception:
        await websocket.close(code=4401, reason="Invalid token")
        return
    # Check user_id matches token
    if str(token_data.user_id) != str(user_id):
        await websocket.close(code=4403, reason="User ID does not match token")
        return
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

@router.get("/audit/org-dashboard/{org_id}")
async def get_organization_dashboard_audit_logs(org_id: str):
    """Get all audit logs for an organization for the dashboard (matches by fintech_id only)"""
    logs = list(logs_collection.find({"fintech_id": org_id}))
    logs.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "user_id": log.get("user_id"),
            "fintech_name": log.get("fintech_name"),
            "fintech_id": log.get("fintech_id"),
            "resource_name": log.get("resource_name"),
            "purpose": log.get("purpose"),
            "log_type": log.get("log_type"),
            "ip_address": log.get("ip_address"),
            "data_source": log.get("data_source"),
            "source_org_id": log.get("source_org_id"),
            "target_org_id": log.get("target_org_id"),
            "created_at": log.get("created_at").isoformat() if log.get("created_at") else None,
            "_id": str(log.get("_id")) if log.get("_id") else None
        })
    return formatted_logs 