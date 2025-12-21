from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List

from ...core.database import get_db
from ...domain import models
from ...schemas import meeting as schemas
from ...services.meeting_service import MeetingService, data_provider
from ..dependencies import get_current_user

router = APIRouter()
meeting_service = MeetingService()

# 🌟 [신규 추가] 장소 검색 API (Home 탭 등에서 사용)
@router.get("/api/places/search")
def search_places(query: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """
    네이버 로컬 검색 API를 통해 장소를 검색합니다.
    """
    # data_provider의 search_places_all_queries를 재활용하여 검색
    # (위치 기반 필터링 없이 검색만 수행)
    results = data_provider.search_places_all_queries([query], "", 0.0, 0.0)
    
    # 프론트엔드 포맷에 맞춰 반환
    response = []
    for place in results:
        # 좌표가 리스트/튜플로 올 수 있으므로 처리
        lat = place.location[0] if isinstance(place.location, (list, tuple)) else place.location
        lng = place.location[1] if isinstance(place.location, (list, tuple)) else 0.0

        response.append({
            "title": place.name,
            "address": "", # address 필드가 없다면 빈 문자열
            "category": place.category,
            "mapx": lng, 
            "mapy": lat, 
            "link": "" 
        })
    return response

# 🌟 [수정] 단순 장소 추천 API (Home 탭) - 이제 [] 대신 실제 추천 로직을 호출합니다.
@router.post("/api/recommend")
def get_recommendation(req: schemas.RecommendRequest, db: Session = Depends(get_db)):
    """
    사용자 취향/목적 기반 단순 장소 추천
    (DB 검색 -> 없으면 네이버 검색 -> 점수 산정 -> 반환)
    """
    return meeting_service.get_recommendations_direct(db, req)

# --- 회의/모임 흐름 (AI 추천, 웹소켓 연동) ---
@router.post("/api/meeting-flow")
async def run_meeting_flow(req: schemas.MeetingFlowRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    AI 매니저가 주도하는 회의/모임 추천 프로세스 시작
    """
    return await meeting_service.run_meeting_flow(db, req, background_tasks)

@router.post("/api/meeting-flow/vote")
async def vote_meeting(req: schemas.VoteRequest, db: Session = Depends(get_db)):
    """
    추천된 장소 카드에 대한 투표 처리
    """
    return await meeting_service.vote_meeting(db, req)

@router.post("/api/meeting-flow/confirm")
async def confirm_meeting(req: schemas.ConfirmRequest, db: Session = Depends(get_db)):
    """
    최종 장소 확정 및 캘린더 등록
    """
    return await meeting_service.confirm_meeting(db, req)

# --- 일정 (Events) 관리 ---
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