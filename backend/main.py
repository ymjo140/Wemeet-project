import json
import re
import random
import numpy as np
from uuid import UUID, uuid4
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# --- 로컬 모듈 임포트 ---
from database import SessionLocal, engine
import models
import algorithm as agora_algo
from data_provider import RealDataProvider
from connection_manager import manager

# DB 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- [의존성] DB 세션 ---
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- [설정] API 키 ---
NAVER_SEARCH_ID = "7hzPrrLNl9CqLaAffBDb" 
NAVER_SEARCH_SECRET = "aijs1MO01i"
NAVER_MAP_ID = "6fuj0ui2d3"
NAVER_MAP_SECRET = "Gp3NcS9Qnd9mAS34qOJj01njeBzTu7D2lTZBJ6ub"

data_provider = RealDataProvider(
    search_id=NAVER_SEARCH_ID, search_secret=NAVER_SEARCH_SECRET,
    map_id=NAVER_MAP_ID, map_secret=NAVER_MAP_SECRET
)

# --- [설정] 키워드 & 태그 맵 ---
TAG_KEYWORD_EXPANSIONS = {
    "한식": ["한정식", "백반", "한식 맛집", "국밥", "김치찌개", "불고기", "솥밥"],
    "양식": ["파스타", "스테이크", "이탈리안", "브런치", "피자", "버거", "양식당"],
    "일식": ["스시", "초밥", "돈카츠", "라멘", "우동", "오마카세", "이자카야", "텐동"],
    "중식": ["짜장면", "짬뽕", "탕수육", "마라탕", "딤섬", "중식당"],
    "고기/구이": ["고기집", "삼겹살", "한우", "갈비", "곱창", "닭갈비", "양대창"],
    "카페": ["카페 추천", "디저트 카페", "브런치 카페", "대형 카페", "조용한 카페", "베이커리", "로스터리"],
    "회의/워크샵": ["회의실 대여", "공유오피스 회의실", "스터디룸", "세미나실", "공간대여", "워크샵"],
    "술/회식": ["술집 추천", "회식하기 좋은", "이자카야", "포차", "호프", "요리주점", "와인바"],
    "조용한": ["조용한 식당", "룸 식당", "조용한 카페", "대화하기 좋은"],
    "분위기": ["분위기 좋은 맛집", "감성 카페", "데이트 코스", "야경", "루프탑"],
    "가성비": ["가성비 맛집", "저렴한 식당", "착한가격"],
    "고급": ["파인다이닝", "호텔 레스토랑", "코스요리", "기념일"]
}
DEFAULT_KEYWORDS_BY_PURPOSE = {
    "meal": ["한식 맛집", "일식 맛집", "양식 맛집", "중식 맛집", "고기집", "밥집", "브런치"],
    "cafe": ["디저트 카페", "베이커리", "대형 카페", "감성 카페", "로스터리"],
    "drinking": ["이자카야", "요리주점", "호프", "포차", "와인바", "칵테일바"],
    "business": ["룸식당", "한정식 코스", "일식 코스", "호텔 라운지", "회의실", "공유오피스"],
    "date": ["분위기 좋은 레스토랑", "파스타 맛집", "와인바", "스테이크", "야경 명소"],
    "study": ["스터디카페", "북카페", "조용한 카페", "노트북 하기 좋은 카페"]
}
BANNED_TEXT_KEYWORDS = ["청소", "철거", "용달", "도매", "렌탈", "병원", "약국"]
ALLOWED_SPACE_CATEGORIES = {"restaurant", "cafe", "izakaya", "bar", "workspace", "place", "fine_dining"}
POSITIVE_SPACE_KEYWORDS = ["맛집", "식당", "카페", "술집", "회의실"]

def expand_tags_to_keywords(purpose: str, user_tags: List[str]) -> List[str]:
    tags = user_tags if user_tags else [purpose]
    keywords = []
    for tag in tags:
        if tag in TAG_KEYWORD_EXPANSIONS: keywords.extend(TAG_KEYWORD_EXPANSIONS[tag])
        else: keywords.append(tag)
    if not user_tags: keywords.extend(DEFAULT_KEYWORDS_BY_PURPOSE.get(purpose, ["맛집"]))
    return list(set(keywords))

def is_valid_place(poi, purpose: str) -> bool:
    # data_provider에서 1차 필터링을 거치므로 여기선 PASS
    return True

# --- [로직] 자연어 처리 (Rule-based) ---
def parse_natural_language_schedule(text: str):
    now = datetime.now()
    result = { "title": "새로운 모임", "date": now.strftime("%Y-%m-%d"), "time": "19:00", "location_name": "미정", "purpose": "meal" }
    
    # 날짜
    if "오늘" in text: result["date"] = now.strftime("%Y-%m-%d")
    elif "내일" in text: result["date"] = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    elif "모레" in text: result["date"] = (now + timedelta(days=2)).strftime("%Y-%m-%d")
    
    # 시간
    time_match = re.search(r"(\d{1,2})시", text)
    if time_match:
        hour = int(time_match.group(1))
        if ("오후" in text or "저녁" in text) and hour < 12: hour += 12
        result["time"] = f"{hour:02d}:00"
    
    # 장소
    loc_match = re.search(r"([가-힣0-9]+)에서", text)
    if loc_match: result["location_name"] = loc_match.group(1)
    
    # 목적
    if any(k in text for k in ["회식", "술"]): result["purpose"] = "drinking"
    elif any(k in text for k in ["스터디", "공부"]): result["purpose"] = "study"
    elif any(k in text for k in ["회의", "미팅"]): result["purpose"] = "business"
    elif "데이트" in text: result["purpose"] = "date"
    elif any(k in text for k in ["카페", "커피"]): result["purpose"] = "cafe"
    
    words = text.split()
    if words: result["title"] = f"{result['location_name']} {words[-1]}"
    return result


# =========================================================
# [DATA MODELS] Pydantic Schemas
# =========================================================

# 1. 캘린더
class EventSchema(BaseModel):
    id: Optional[str] = None
    user_id: int
    title: str
    date: str
    time: str
    duration_hours: float = 1.5
    location_name: Optional[str] = None
    purpose: str
    class Config: orm_mode = True

# 2. 커뮤니티 & 채팅
class MemberSchema(BaseModel):
    id: int; name: str; avatar: str; manner: float
    class Config: orm_mode = True

class CommunitySchema(BaseModel):
    id: Optional[str] = None; host_id: int; title: str; category: str; location: str
    date_time: str; max_members: int; description: str; tags: List[str] = []; rating: float = 0.0
    current_members: List[MemberSchema] = [] 
    class Config: orm_mode = True

class ChatRoomSchema(BaseModel):
    id: int; name: str; lastMessage: str; time: str; unread: int; isGroup: bool = True

# 3. 요청
class UserRequest(BaseModel):
    id: int; name: str; history_poi_ids: List[int] = []
class RecommendRequest(BaseModel):
    users: List[UserRequest]; purpose: str; location_name: str
    current_lat: float; current_lng: float; user_selected_tags: List[str] = []
class AvailabilityRequest(BaseModel):
    user_ids: List[int]; days_to_check: int = 7
class NlpRequest(BaseModel):
    text: str


# =========================================================
# [API ENDPOINTS]
# =========================================================

# --- 초기 데이터 (Startup) ---
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    if db.query(models.User).count() == 0:
        print("🚀 초기 데이터 주입 중...")
        users = [
            models.User(id=1, name="나", avatar="👤", manner=36.5),
            models.User(id=2, name="클레오", avatar="👦", manner=42.0),
            models.User(id=3, name="벤지", avatar="🧑", manner=39.5),
            models.User(id=4, name="로건", avatar="👧", manner=37.0),
        ]
        db.add_all(users)
        db.commit()
        print("✅ 초기 데이터 주입 완료")
    db.close()

# --- WebSocket (Real-time Chat) ---
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_json() # {content: "..."}
            # 메시지 저장 (실제 DB가 room_id를 int로 쓰는지 str로 쓰는지 맞춰야 함. 여기선 str UUID 가정)
            # 주의: models.py의 ChatRoom.id가 Integer라면 room_id를 변환 필요.
            # 현재 Community.id가 UUID(str)이므로, ChatRoom도 str id를 쓰거나 매핑해야 함.
            # 여기서는 단순화를 위해 메모리상의 연결만 처리하고 DB 저장은 생략하거나 models 수정을 가정.
            
            user = db.query(models.User).filter(models.User.id == user_id).first()
            await manager.broadcast({
                "user_id": user_id, "name": user.name, "avatar": user.avatar,
                "content": data['content'], "timestamp": datetime.now().strftime("%H:%M")
            }, room_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

# --- AI ---
@app.post("/api/ai/parse-schedule")
def parse_schedule(req: NlpRequest):
    return parse_natural_language_schedule(req.text)

# --- Community ---
@app.get("/api/communities", response_model=List[CommunitySchema])
def get_communities(db: Session = Depends(get_db)):
    comms = db.query(models.Community).all()
    results = []
    for c in comms:
        member_ids = c.member_ids if c.member_ids else []
        members_data = []
        if member_ids:
            users = db.query(models.User).filter(models.User.id.in_(member_ids)).all()
            for u in users:
                members_data.append(MemberSchema(id=u.id, name=u.name, avatar=u.avatar, manner=u.manner))
        results.append(CommunitySchema(
            id=c.id, host_id=c.host_id, title=c.title, category=c.category, location=c.location,
            date_time=c.date_time, max_members=c.max_members, description=c.description,
            tags=c.tags, rating=c.rating, current_members=members_data
        ))
    return sorted(results, key=lambda x: x.date_time, reverse=True)

@app.post("/api/communities", response_model=CommunitySchema)
def create_community(comm: CommunitySchema, db: Session = Depends(get_db)):
    new_id = str(uuid4())
    db_comm = models.Community(
        id=new_id, host_id=comm.host_id, title=comm.title, category=comm.category,
        location=comm.location, date_time=comm.date_time, max_members=comm.max_members,
        description=comm.description, tags=comm.tags, rating=5.0, member_ids=[comm.host_id]
    )
    db.add(db_comm)
    db.commit()
    
    # 응답용
    host = db.query(models.User).filter(models.User.id == comm.host_id).first()
    comm.id = new_id
    comm.current_members = [MemberSchema(id=host.id, name=host.name, avatar=host.avatar, manner=host.manner)]
    comm.rating = 5.0
    return comm

@app.post("/api/communities/{community_id}/join")
def join_community(community_id: str, db: Session = Depends(get_db)):
    comm = db.query(models.Community).filter(models.Community.id == community_id).first()
    if not comm: raise HTTPException(404, "Not found")
    
    my_id = 1
    curr = list(comm.member_ids) if comm.member_ids else []
    if len(curr) >= comm.max_members: raise HTTPException(400, "Full")
    if my_id in curr: return {"message": "Already joined", "chat_id": comm.id}
    
    curr.append(my_id)
    comm.member_ids = curr
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(comm, "member_ids")
    db.commit()
    return {"message": "Joined", "chat_id": comm.id}

# --- Calendar ---
@app.post("/api/events", response_model=EventSchema)
def create_event(event: EventSchema, db: Session = Depends(get_db)):
    db_event = models.Event(
        id=str(uuid4()), user_id=event.user_id, title=event.title, date=event.date,
        time=event.time, duration_hours=event.duration_hours, location_name=event.location_name, purpose=event.purpose
    )
    db.add(db_event)
    db.commit()
    return db_event

@app.get("/api/events", response_model=List[EventSchema])
def get_events(db: Session = Depends(get_db)):
    return db.query(models.Event).all()

@app.put("/api/events/{event_id}")
def update_event(event_id: str, updated: EventSchema, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event: raise HTTPException(404, "Not found")
    event.title = updated.title; event.date = updated.date; event.time = updated.time
    event.location_name = updated.location_name; event.purpose = updated.purpose
    db.commit()
    return event

@app.delete("/api/events/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event: raise HTTPException(404, "Not found")
    db.delete(event)
    db.commit()
    return {"detail": "Deleted"}

@app.post("/api/group-availability")
def group_availability(req: AvailabilityRequest, db: Session = Depends(get_db)):
    events = db.query(models.Event).filter(models.Event.user_id.in_(req.user_ids)).all()
    booked = set()
    for ev in events:
        try:
            dt = datetime.strptime(f"{ev.date} {ev.time}", "%Y-%m-%d %H:%M")
            curr = dt
            while curr < dt + timedelta(hours=ev.duration_hours):
                booked.add(curr.strftime("%Y-%m-%d %H:%M"))
                curr += timedelta(minutes=30)
        except: continue
    avail = []
    curr = datetime.now().date()
    end = curr + timedelta(days=req.days_to_check)
    while curr <= end:
        for h in range(9, 22):
            s = datetime.combine(curr, time(h, 0)).strftime("%Y-%m-%d %H:%M")
            if s not in booked: avail.append(s)
        curr += timedelta(days=1)
    return {"available_slots": avail, "user_ids": req.user_ids}

# --- Recommendation ---
@app.post("/api/recommend")
def get_recommendation(req: RecommendRequest):
    algo_users = [agora_algo.User(u.id, u.name, u.history_poi_ids) for u in req.users]
    base_loc = req.location_name
    user_tags = req.user_selected_tags

    target_keywords = expand_tags_to_keywords(req.purpose, user_tags)
    final_queries = [f"{base_loc} {kw}" for kw in target_keywords]
    print(f"🔍 검색: {final_queries[:5]}...")

    candidates = data_provider.search_places_all_queries(
        queries=final_queries, location=base_loc,
        center_lat=req.current_lat, center_lng=req.current_lng,
    )
    if not candidates: return []

    filtered_candidates = [p for p in candidates if is_valid_place(p, req.purpose)]
    if not filtered_candidates:
        filtered_candidates = [p for p in candidates if not any(bad in (p.name + " " + " ".join(p.tags)).lower() for bad in BANNED_TEXT_KEYWORDS)]
    if not filtered_candidates: return []

    engine = agora_algo.AgoraRecommender(algo_users, filtered_candidates)
    try:
        results = engine.recommend(algo_users, req.purpose, np.array([req.current_lat, req.current_lng]), user_tags or [])
        return [{
            "id": p.id, "name": p.name, "category": p.category, 
            "score": float(s), "tags": p.tags, 
            "location": [p.location[0], p.location[1]], "image": "/placeholder.svg"
        } for p, s in results]
    except: return []