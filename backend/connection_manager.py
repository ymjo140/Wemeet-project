from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # 방 ID별 연결된 소켓 리스트: {room_id: [websocket1, websocket2]}
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        print(f"🔌 Client connected to Room {room_id}. Total: {len(self.active_connections[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: int):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
                if not self.active_connections[room_id]:
                    del self.active_connections[room_id]
        print(f"🔌 Client disconnected from Room {room_id}")

    async def broadcast(self, message: dict, room_id: int):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_json(message)

manager = ConnectionManager()