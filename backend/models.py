from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid
import enum

def generate_uuid():
    return str(uuid.uuid4())

class ItemCategory(str, enum.Enum):
    BODY = "body"
    EYES = "eyes"
    BROWS = "eyebrows"
    HAIR = "hair"
    TOP = "top"
    BOTTOM = "bottom"
    SHOES = "shoes"
    PET = "pet"
    FOOTPRINT = "footprint"

# 🌟 [완전 개편] 장소 데이터 자산화 모델
class Place(Base):
    __tablename__ = "places"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 1. 기본 정보
    name = Column(String, index=True, nullable=False)
    category = Column(String) # restaurant, cafe, workspace
    
    # 2. 📍 위치 정보 (중복 방지의 핵심)
    address = Column(String, nullable=True) # 도로명 주소
    lat = Column(Float, nullable=False)     # 위도
    lng = Column(Float, nullable=False)     # 경도
    
    # 3. 메타 데이터
    tags = Column(JSON, default=[]) 
    wemeet_rating = Column(Float, default=0.0) # 자체 평점
    review_count = Column(Integer, default=0)
    
    external_link = Column(String, nullable=True)

class MeetingLog(Base):
    __tablename__ = "meeting_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    community_id = Column(String, nullable=True)
    host_id = Column(Integer, ForeignKey("users.id"))
    
    # Place 테이블과 연결
    place_id = Column(Integer, ForeignKey("places.id"), nullable=True)
    place_name = Column(String) 
    
    date = Column(String) 
    purpose = Column(String) 
    participants = Column(JSON) 
    
    is_successful = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String, index=True)
    
    # 🌟 [신규] 데이터 분석용 세분화 필드
    gender = Column(String, default="unknown") # male, female, unknown
    age_group = Column(String, default="20s")  # 10s, 20s, 30s, 40s, 50+
    
    avatar = Column(String)
    manner = Column(Float, default=36.5)
    lat = Column(Float, default=37.566)
    lng = Column(Float, default=126.978)
    
    preferences = Column(JSON, default={"tag_weights": {}, "avg_spend": 20000}) 
    preference_vector = Column(JSON, default={}) 
    
    payment_history = Column(JSON, default=[])
    favorites = Column(JSON, default=[]) 

    wallet_balance = Column(Integer, default=3000) 
    avatar_info = relationship("UserAvatar", uselist=False, back_populates="user")
    
    review_count = Column(Integer, default=0)
    avg_rating_given = Column(Float, default=0.0)

class AvatarItem(Base):
    __tablename__ = "avatar_items"
    id = Column(String, primary_key=True) 
    category = Column(String, index=True) 
    name = Column(String)
    image_url = Column(String) 
    price_coin = Column(Integer, default=0)
    is_limited = Column(Boolean, default=False)
    metadata_json = Column(JSON, default={}) 

class UserAvatar(Base):
    __tablename__ = "user_avatars"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    equipped = Column(JSON, default={})
    inventory = Column(JSON, default=[])
    level = Column(Integer, default=1)
    current_energy = Column(Integer, default=100)
    total_steps = Column(Integer, default=0)
    user = relationship("User", back_populates="avatar_info")

class UserStepLog(Base):
    __tablename__ = "user_step_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(String, index=True) 
    steps_count = Column(Integer, default=0)
    reward_claimed = Column(Boolean, default=False)

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True) 
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.now)
    sender = relationship("User")
    votes = relationship("Vote", back_populates="message", cascade="all, delete-orphan")

class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    vote_type = Column(String)
    message = relationship("Message", back_populates="votes")
    user = relationship("User")
    __table_args__ = (UniqueConstraint('message_id', 'user_id', name='_user_message_vote_uc'),)

class Event(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    date = Column(String) 
    time = Column(String) 
    duration_hours = Column(Float, default=1.5)
    location_name = Column(String, nullable=True)
    purpose = Column(String)
    # 공개/비공개 설정
    is_private = Column(Boolean, default=False)

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
    tags = Column(JSON) 
    rating = Column(Float, default=0.0)
    member_ids = Column(JSON, default=[])
    pending_member_ids = Column(JSON, default=[])

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # 🌟 [수정] 장소 테이블과 연동
    place_id = Column(Integer, ForeignKey("places.id"), nullable=True)
    place_name = Column(String) 
    
    score_taste = Column(Integer, default=3)
    score_service = Column(Integer, default=3)
    score_price = Column(Integer, default=3)
    score_vibe = Column(Integer, default=3)
    
    rating = Column(Float) 
    calibrated_rating = Column(Float, nullable=True) 
    reason = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    tags = Column(JSON) 
    created_at = Column(DateTime, default=datetime.now)
    
    user = relationship("User")
    place = relationship("Place")

# 🌟 [신규] 친구 관계 테이블
class Friendship(Base):
    __tablename__ = "friendships"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id")) # 요청한 사람
    receiver_id = Column(Integer, ForeignKey("users.id"))  # 받은 사람
    status = Column(String, default="pending") # pending(대기), accepted(수락)
    created_at = Column(DateTime, default=datetime.now)

# 1. 💰 코인 내역 (입출금 장부)
class CoinHistory(Base):
    __tablename__ = "coin_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Integer) # +50 (획득), -100 (사용)
    type = Column(String) # "check_in"(방문), "campaign"(체험단), "shop"(상점), "game"(보물찾기)
    description = Column(String) # "강남역 스타벅스 방문", "아바타 옷 구매"
    created_at = Column(DateTime, default=datetime.now)

# 2. 📍 방문 기록 (중복 방지용)
class VisitLog(Base):
    __tablename__ = "visit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    place_name = Column(String) # 장소 이름 (예: "스타벅스 강남점")
    created_at = Column(DateTime, default=datetime.now)

# 3. 🎁 체험단/이벤트 (사장님 광고)
class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id")) # 광고주(사장님) ID
    title = Column(String) # "홍대 파스타 무료 시식권 + 5000코인"
    content = Column(String) # 상세 내용 (미션: 사진 3장 필수 등)
    reward_coin = Column(Integer) # 보상 코인 (예: 5000)
    location = Column(String) # 가게 위치 (좌표 or 주소)
    max_applicants = Column(Integer) # 선착순 인원
    status = Column(String, default="open") # open(모집중), closed(마감)
    created_at = Column(DateTime, default=datetime.now)

# 🌟 [신규] 주요 지점 간 이동 시간 캐시 (OD Matrix)
class TravelTimeCache(Base):
    __tablename__ = "travel_time_cache"
    
    # 복합 키 (출발지_도착지)
    id = Column(String, primary_key=True) # 예: "강남_홍대입구"
    start_name = Column(String, index=True)
    end_name = Column(String, index=True)
    total_time = Column(Integer) # 소요 시간(분)
    created_at = Column(DateTime, default=datetime.now)

# 🌟 [신규] 완료된 모임의 데이터 (AI 학습/추천용)
class MeetingHistory(Base):
    __tablename__ = "meeting_histories"

    id = Column(Integer, primary_key=True, index=True)
    
    # 모임 특성 (Clustering Feature)
    purpose = Column(String, index=True)  # 예: "식사", "회식"
    tags = Column(String)     # 예: "조용한,가성비" (JSON string or Comma-separated)
    participant_count = Column(Integer) # 인원수 (비슷한 규모끼리 묶기 위해)
    region_name = Column(String) # 예: "강남"
    
    # 선택 결과 (Label)
    place_name = Column(String) # 예: "땀땀 강남점"
    place_category = Column(String) # 예: "음식점"
    
    # 피드백 (가중치용)
    satisfaction_score = Column(Float, default=4.0) # 1~5점 (기본 4.0)
    
    created_at = Column(DateTime, default=datetime.now)