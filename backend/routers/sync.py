import requests
import xml.etree.ElementTree as ET
from icalendar import Calendar
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import uuid4
from pydantic import BaseModel
import re

import models
from dependencies import get_db, get_current_user

router = APIRouter()

class SyncRequest(BaseModel):
    url: str
    source_name: str  # "구글" or "에브리타임"

# 🌟 에브리타임 전용 파싱 로직
def sync_everytime_logic(url: str, user_id: int, db: Session):
    # 1. URL에서 식별자(identifier) 추출
    # 예: https://everytime.kr/@LMRI9NEiKV4MA358gDZQ -> LMRI9NEiKV4MA358gDZQ
    match = re.search(r'everytime\.kr/@([A-Za-z0-9]+)', url)
    if not match:
        raise HTTPException(status_code=400, detail="올바른 에브리타임 URL이 아닙니다. (예: https://everytime.kr/@...)")
    
    identifier = match.group(1)
    
    # 2. 에브리타임 API 호출 (XML 데이터 받기)
    api_url = "https://api.everytime.kr/find/timetable/table/friend"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": "https://everytime.kr/"
    }
    
    try:
        response = requests.post(api_url, data={"identifier": identifier}, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="에브리타임 시간표를 가져올 수 없습니다. URL이 만료되었거나 비공개일 수 있습니다.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"에브리타임 서버 연결 실패: {str(e)}")

    # 3. XML 파싱
    try:
        # 에브리타임 XML 구조: <response><table ...><subject ...><name value="..." /><data day="..." ... />
        root = ET.fromstring(response.content)
    except ET.ParseError:
        raise HTTPException(status_code=422, detail="에브리타임 데이터 형식을 해석할 수 없습니다.")

    new_events = []
    
    # 🌟 이번 학기 기준일 설정 (오늘이 속한 주의 월요일을 개강일로 가정하거나, 오늘부터 시작)
    today = datetime.now().date()
    # 월요일(0)을 기준으로 이번 주 월요일 계산
    start_of_week = today - timedelta(days=today.weekday())
    
    # XML 구조 순회
    for subject in root.iter("subject"):
        # 수업명과 교수님 정보 가져오기 (속성값 value에 있음)
        name_tag = subject.find("name")
        name = name_tag.get("value") if name_tag is not None else "강의명 없음"
        
        professor_tag = subject.find("professor")
        # professor = professor_tag.get("value") if professor_tag is not None else ""
        
        # 시간/장소 정보 파싱 (subject 태그 안의 time -> data 태그들)
        # 구조가 <subject> ... <time value="..."><data ... /></time> </subject> 형태일 수 있음
        # 혹은 바로 <data>가 있을 수도 있으므로 iter("data")로 안전하게 순회
        for data in subject.iter("data"):
            day_idx = int(data.get("day")) # 0: 월, 1: 화, ... 6: 일
            start_val = int(data.get("starttime")) # 5분 단위 정수
            end_val = int(data.get("endtime"))
            place = data.get("place", "강의실 미정")

            # 🌟 시간 변환 로직 (에타는 5분 단위, 0 = 00:00)
            # 예: 108 * 5 = 540분 = 9시간 0분 = 09:00
            start_hour = (start_val * 5) // 60
            start_minute = (start_val * 5) % 60
            time_str = f"{start_hour:02d}:{start_minute:02d}"
            
            # 소요 시간 계산
            duration_minutes = (end_val - start_val) * 5
            duration_hours = round(duration_minutes / 60.0, 1)
            
            # 🌟 [반복 일정 생성] 이번 주부터 16주(한 학기) 동안 반복
            for week in range(16):
                # 해당 주차의 수업 날짜 계산
                # (이번주 월요일) + (수업 요일) + (주차 * 7일)
                target_date = start_of_week + timedelta(days=day_idx) + timedelta(weeks=week)
                
                # 이미 지난 날짜도 기록하거나, 오늘 이후만 기록하도록 설정 가능
                # if target_date < today: continue

                new_event = models.Event(
                    id=str(uuid4()),
                    user_id=user_id,
                    title=f"[수업] {name}",
                    date=target_date.strftime("%Y-%m-%d"),
                    time=time_str,
                    duration_hours=duration_hours,
                    location_name=place,
                    purpose="학업"
                )
                db.add(new_event)
                new_events.append(new_event)

    db.commit()
    return new_events

@router.post("/api/sync/ical")
def sync_calendar(req: SyncRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        new_events = []

        # 🌟 1. 에브리타임 로직
        if req.source_name == "에브리타임":
            new_events = sync_everytime_logic(req.url, current_user.id, db)
            
        # 🌟 2. 구글/iCal 로직 (기존 유지)
        else:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(req.url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="URL에 접속할 수 없습니다.")

            if b"BEGIN:VCALENDAR" not in response.content:
                raise HTTPException(status_code=422, detail="올바른 iCal 형식이 아닙니다.")

            cal = Calendar.from_ical(response.content)
            
            for component in cal.walk():
                if component.name == "VEVENT":
                    summary = str(component.get('summary', '제목 없음'))
                    dtstart_prop = component.get('dtstart')
                    if not dtstart_prop: continue
                    dtstart = dtstart_prop.dt
                    
                    dtend_prop = component.get('dtend')
                    dtend = dtend_prop.dt if dtend_prop else None
                    
                    # 날짜/시간 포맷 통일
                    if isinstance(dtstart, datetime):
                        date_str = dtstart.strftime("%Y-%m-%d")
                        time_str = dtstart.strftime("%H:%M")
                    else:
                        date_str = dtstart.strftime("%Y-%m-%d")
                        time_str = "09:00"

                    duration = 1.0
                    if dtend:
                        if isinstance(dtend, datetime) and isinstance(dtstart, datetime):
                            # timezone 정보 제거 후 계산
                            d1 = dtend.replace(tzinfo=None)
                            d2 = dtstart.replace(tzinfo=None)
                            duration = (d1 - d2).total_seconds() / 3600
                        elif not isinstance(dtstart, datetime):
                            duration = 24.0

                    location = str(component.get('location', ''))
                    
                    new_event = models.Event(
                        id=str(uuid4()),
                        user_id=current_user.id,
                        title=f"[{req.source_name}] {summary}",
                        date=date_str,
                        time=time_str,
                        duration_hours=round(duration, 1),
                        location_name=location if location else f"{req.source_name} 일정",
                        purpose="개인"
                    )
                    db.add(new_event)
                    new_events.append(new_event)
            db.commit()

        return {"message": f"{len(new_events)}개의 일정을 성공적으로 불러왔습니다!", "count": len(new_events)}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Sync Error: {e}")
        raise HTTPException(status_code=500, detail=f"연동 실패: {str(e)}")