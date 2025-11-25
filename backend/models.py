from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    avatar = Column(String)
    manner = Column(Float, default=36.5)

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    
    messages = relationship("Message", back_populates="room")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.now)
    
    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User")

class Event(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    date = Column(String) # YYYY-MM-DD
    time = Column(String) # HH:MM
    duration_hours = Column(Float, default=1.5)
    location_name = Column(String, nullable=True)
    purpose = Column(String)

class Community(Base):
    __tablename__ = "communities"
    id = Column(String, primary_key=True, default=generate_uuid)
    host_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    category = Column(String)
    location = Column(String)
    date_time = Column(String)
    max_members = Column(Integer)
    description = Column(String)
    tags = Column(JSON) # 리스트 저장을 위해 JSON 타입 사용
    rating = Column(Float, default=0.0)
    
    # 참여 멤버 ID 목록 (간소화를 위해 JSON으로 저장)
    member_ids = Column(JSON, default=[])