from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # 방 ID는 문자열(str)입니다! (UUID 호환)
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        
        room_id_str = str(room_id)
        
        if room_id_str not in self.active_connections:
            self.active_connections[room_id_str] = []
            
        self.active_connections[room_id_str].append(websocket)
        print(f"🔌 Client connected to Room {room_id_str}. Total: {len(self.active_connections[room_id_str])}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        room_id_str = str(room_id)
        
        if room_id_str in self.active_connections:
            if websocket in self.active_connections[room_id_str]:
                self.active_connections[room_id_str].remove(websocket)
                
            if not self.active_connections[room_id_str]:
                del self.active_connections[room_id_str]
                
        print(f"🔌 Client disconnected from Room {room_id_str}")

    async def broadcast(self, message: dict, room_id: str):
        room_id_str = str(room_id)
        
        if room_id_str in self.active_connections:
            for connection in self.active_connections[room_id_str]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"⚠️ 전송 실패 (유령 연결 정리): {e}")

manager = ConnectionManager()