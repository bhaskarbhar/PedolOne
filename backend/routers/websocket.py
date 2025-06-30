from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

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