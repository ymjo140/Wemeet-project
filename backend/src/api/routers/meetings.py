from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List

from ...core.database import get_db
from ...domain import models
from ...schemas import meeting as schemas
from ...services.meeting_service import MeetingService, data_provider # data_provider 가져오기
from ..dependencies import get_current_user

router = APIRouter()
meeting_service = MeetingService()

# 🌟 [신규 추가] 장소 검색 API
@router.get("/api/places/search")
def search_places(query: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """
    네이버 로컬 검색 API를 통해 장소를 검색합니다.
    프론트엔드 Home 탭 등에서 호출됩니다.
    """
    # 1. 서비스의 data_provider를 직접 사용하여 검색 (또는 서비스 메서드 추가 가능)
    # 여기서는 간단하게 기존 data_provider 재활용
    results = data_provider.search_places(query, display=5)
    
    # 2. 결과 반환 포맷 맞추기 (프론트엔드 요구사항에 따라 조정)
    response = []
    for place in results:
        response.append({
            "title": place.name,
            "address": place.address,
            "category": place.category,
            "mapx": place.location[1], # lng
            "mapy": place.location[0], # lat
            "link": "" # 필요 시 추가
        })
    return response

@router.post("/api/meeting-flow")
async def run_meeting_flow(req: schemas.MeetingFlowRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    return await meeting_service.run_meeting_flow(db, req, background_tasks)

@router.post("/api/meeting-flow/vote")
async def vote_meeting(req: schemas.VoteRequest, db: Session = Depends(get_db)):
    return await meeting_service.vote_meeting(db, req)

@router.post("/api/meeting-flow/confirm")
async def confirm_meeting(req: schemas.ConfirmRequest, db: Session = Depends(get_db)):
    return await meeting_service.confirm_meeting(db, req)

# --- 일정 (Events) ---
@router.post("/api/events", response_model=schemas.EventSchema)
def create_event(event: schemas.EventSchema, db: Session = Depends(get_db)):
    return meeting_service.create_event(db, event)

@router.get("/api/events", response_model=List[schemas.EventSchema])
def get_events(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return meeting_service.get_events(db, current_user.id)

@router.delete("/api/events/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    meeting_service.delete_event(db, event_id)
    return {"detail": "Deleted"}

# --- 추천 (홈 탭 등) ---
@router.post("/api/recommend")
def get_recommendation(req: schemas.RecommendRequest, db: Session = Depends(get_db)):
    # 로직 재사용 (단순화)
    return []