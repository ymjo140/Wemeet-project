import random
import numpy as np
import json
import re
import requests
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, ConfigDict
import google.generativeai as genai

import models
import algorithm as agora_algo
from data_provider import RealDataProvider
from dependencies import get_db, get_current_user # 🌟 get_current_user 확인 필수
from constants import (
    NAVER_SEARCH_ID, NAVER_SEARCH_SECRET, NAVER_MAP_ID, NAVER_MAP_SECRET, 
    GEMINI_API_KEY, ODSAY_API_KEY, PURPOSE_CONFIG, TAG_KEYWORD_EXPANSIONS, PURPOSE_DURATIONS
)

genai.configure(api_key=GEMINI_API_KEY)
data_provider = RealDataProvider(NAVER_SEARCH_ID, NAVER_SEARCH_SECRET, NAVER_MAP_ID, NAVER_MAP_SECRET)

router = APIRouter()

# 🌟 [1] 백업 좌표 리스트 (1~9호선, 분당선 등 주요 거점)
FALLBACK_COORDINATES = {
    # 1호선
    "서울역": (37.5559, 126.9723), "시청": (37.5657, 126.9769), "종각": (37.5702, 126.9831),
    "종로3가": (37.5704, 126.9920), "종로5가": (37.5709, 127.0019), "동대문": (37.5717, 127.0113),
    "신설동": (37.5760, 127.0243), "제기동": (37.5781, 127.0348), "청량리": (37.5801, 127.0485),
    "회기": (37.5894, 127.0575), "외대앞": (37.5961, 127.0635), "신이문": (37.6017, 127.0671),
    "석계": (37.6148, 127.0656), "광운대": (37.6236, 127.0617), "월계": (37.6331, 127.0588),
    "녹천": (37.6445, 127.0513), "창동": (37.6531, 127.0477), "방학": (37.6677, 127.0443),
    "도봉": (37.6795, 127.0455), "도봉산": (37.6895, 127.0461), "남영": (37.5410, 126.9713),
    "용산": (37.5298, 126.9645), "노량진": (37.5142, 126.9424), "대방": (37.5133, 126.9263),
    "신길": (37.5170, 126.9171), "영등포": (37.5155, 126.9076), "신도림": (37.5089, 126.8913),
    "구로": (37.5030, 126.8819), "가산디지털단지": (37.4815, 126.8825), "금천구청": (37.4559, 126.8943),
    "안양": (37.4016, 126.9228), "수원": (37.2656, 127.0000),

    # 2호선
    "강남": (37.4980, 127.0276), "역삼": (37.5006, 127.0364), "선릉": (37.5045, 127.0490),
    "삼성": (37.5088, 127.0631), "종합운동장": (37.5109, 127.0736), "잠실새내": (37.5116, 127.0863),
    "잠실": (37.5132, 127.1001), "잠실나루": (37.5207, 127.1037), "강변": (37.5351, 127.0946),
    "구의": (37.5370, 127.0859), "건대입구": (37.5407, 127.0702), "성수": (37.5445, 127.0560),
    "뚝섬": (37.5471, 127.0473), "한양대": (37.5552, 127.0436), "왕십리": (37.5612, 127.0371),
    "상왕십리": (37.5643, 127.0296), "신당": (37.5656, 127.0196), "동대문역사문화공원": (37.5651, 127.0078),
    "을지로4가": (37.5666, 126.9980), "을지로3가": (37.5662, 126.9926), "을지로입구": (37.5660, 126.9826),
    "충정로": (37.5599, 126.9636), "아현": (37.5573, 126.9561), "이대": (37.5567, 126.9460),
    "신촌": (37.5551, 126.9369), "홍대입구": (37.5575, 126.9244), "합정": (37.5489, 126.9166),
    "당산": (37.5343, 126.9022), "영등포구청": (37.5249, 126.8959), "문래": (37.5179, 126.8947),
    "대림": (37.4925, 126.8949), "구로디지털단지": (37.4852, 126.9014), "신대방": (37.4874, 126.9131),
    "신림": (37.4842, 126.9297), "봉천": (37.4823, 126.9416), "서울대입구": (37.4812, 126.9527),
    "낙성대": (37.4769, 126.9636), "사당": (37.4765, 126.9815), "방배": (37.4814, 126.9975),
    "서초": (37.4918, 127.0076), "교대": (37.4934, 127.0140),

    # 3호선
    "지축": (37.6480, 126.9139), "구파발": (37.6367, 126.9188), "연신내": (37.6190, 126.9210),
    "불광": (37.6104, 126.9298), "녹번": (37.6009, 126.9357), "홍제": (37.5890, 126.9437),
    "무악재": (37.5822, 126.9502), "독립문": (37.5745, 126.9583), "경복궁": (37.5757, 126.9735),
    "안국": (37.5765, 126.9854), "충무로": (37.5612, 126.9942), "동대입구": (37.5590, 127.0056),
    "약수": (37.5543, 127.0107), "금호": (37.5480, 127.0158), "옥수": (37.5414, 127.0178),
    "압구정": (37.5270, 127.0284), "신사": (37.5163, 127.0203), "잠원": (37.5127, 127.0112),
    "고속터미널": (37.5049, 127.0049), "남부터미널": (37.4850, 127.0161), "양재": (37.4841, 127.0346),
    "매봉": (37.4869, 127.0467), "도곡": (37.4902, 127.0551), "대치": (37.4946, 127.0636),
    "학여울": (37.4966, 127.0714), "대청": (37.4935, 127.0795), "일원": (37.4836, 127.0843),
    "수서": (37.4873, 127.1018), "가락시장": (37.4925, 127.1182), "경찰병원": (37.4959, 127.1264),
    "오금": (37.5021, 127.1281),

    # 4호선
    "당고개": (37.6702, 127.0794), "상계": (37.6608, 127.0735), "노원": (37.6551, 127.0613),
    "창동": (37.6531, 127.0477), "쌍문": (37.6486, 127.0347), "수유": (37.6380, 127.0257),
    "미아": (37.6296, 127.0264), "미아사거리": (37.6132, 127.0300), "길음": (37.6034, 127.0250),
    "성신여대입구": (37.5926, 127.0170), "한성대입구": (37.5884, 127.0060), "혜화": (37.5822, 127.0018),
    "명동": (37.5609, 126.9863), "회현": (37.5585, 126.9782), "숙대입구": (37.5448, 126.9721),
    "삼각지": (37.5347, 126.9731), "신용산": (37.5291, 126.9679), "이촌": (37.5222, 126.9743),
    "동작": (37.5028, 126.9793), "이수": (37.4862, 126.9819), "사당": (37.4765, 126.9815),
    "남태령": (37.4638, 126.9891), "선바위": (37.4515, 127.0023), "과천": (37.4330, 126.9965),
    "인덕원": (37.4010, 126.9765), "평촌": (37.3942, 126.9638), "범계": (37.3897, 126.9507),

    # 5호선
    "방화": (37.5774, 126.8127), "김포공항": (37.5624, 126.8013), "마곡": (37.5601, 126.8254),
    "발산": (37.5585, 126.8376), "화곡": (37.5415, 126.8404), "까치산": (37.5317, 126.8466),
    "신정": (37.5249, 126.8561), "목동": (37.5259, 126.8648), "오목교": (37.5244, 126.8750),
    "양평": (37.5256, 126.8861), "영등포구청": (37.5249, 126.8959), "영등포시장": (37.5226, 126.9051),
    "신길": (37.5170, 126.9171), "여의도": (37.5215, 126.9243), "여의나루": (37.5270, 126.9329),
    "마포": (37.5395, 126.9459), "공덕": (37.5435, 126.9515), "애오개": (37.5537, 126.9568),
    "충정로": (37.5599, 126.9636), "서대문": (37.5657, 126.9666), "광화문": (37.5710, 126.9768),
    "청구": (37.5602, 127.0138), "왕십리": (37.5612, 127.0371), "마장": (37.5661, 127.0429),
    "답십리": (37.5667, 127.0527), "장한평": (37.5614, 127.0646), "군자": (37.5571, 127.0794),
    "아차산": (37.5516, 127.0897), "광나루": (37.5453, 127.1035), "천호": (37.5386, 127.1236),
    "강동": (37.5358, 127.1324), "길동": (37.5378, 127.1400), "올림픽공원": (37.5162, 127.1309),

    # 6호선
    "디지털미디어시티": (37.5774, 126.8995), "월드컵경기장": (37.5695, 126.8990), "마포구청": (37.5635, 126.9033),
    "망원": (37.5559, 126.9099), "합정": (37.5489, 126.9166), "상수": (37.5477, 126.9229),
    "광흥창": (37.5474, 126.9324), "대흥": (37.5477, 126.9420), "효창공원앞": (37.5392, 126.9613),
    "삼각지": (37.5347, 126.9731), "녹사평": (37.5346, 126.9866), "이태원": (37.5345, 126.9943),
    "한강진": (37.5396, 127.0017), "버티고개": (37.5480, 127.0070), "약수": (37.5543, 127.0107),
    "청구": (37.5602, 127.0138), "신당": (37.5656, 127.0196), "동묘앞": (37.5732, 127.0165),
    "창신": (37.5796, 127.0152), "보문": (37.5852, 127.0193), "안암": (37.5863, 127.0292),
    "고려대": (37.5905, 127.0358), "석계": (37.6148, 127.0656), "태릉입구": (37.6179, 127.0751),

    # 7호선
    "도봉산": (37.6895, 127.0461), "노원": (37.6551, 127.0613), "태릉입구": (37.6179, 127.0751),
    "상봉": (37.5965, 127.0850), "건대입구": (37.5407, 127.0702), "뚝섬유원지": (37.5315, 127.0667),
    "청담": (37.5193, 127.0533), "강남구청": (37.5171, 127.0412), "학동": (37.5142, 127.0316),
    "논현": (37.5110, 127.0214), "반포": (37.5081, 127.0116), "고속터미널": (37.5049, 127.0049),
    "내방": (37.4876, 126.9935), "이수": (37.4862, 126.9819), "남성": (37.4845, 126.9712),
    "숭실대입구": (37.4960, 126.9537), "상도": (37.5028, 126.9479), "장승배기": (37.5048, 126.9391),
    "신대방삼거리": (37.4997, 126.9282), "보라매": (37.4998, 126.9204), "신풍": (37.5000, 126.9099),
    "대림": (37.4925, 126.8949), "남구로": (37.4860, 126.8872), "가산디지털단지": (37.4815, 126.8825),
    "철산": (37.4760, 126.8679), "광명사거리": (37.4792, 126.8548), "온수": (37.4922, 126.8233),

    # 8호선
    "암사": (37.5499, 127.1271), "천호": (37.5386, 127.1236), "강동구청": (37.5303, 127.1205),
    "몽촌토성": (37.5174, 127.1123), "잠실": (37.5132, 127.1001), "석촌": (37.5054, 127.1069),
    "송파": (37.4997, 127.1121), "가락시장": (37.4925, 127.1182), "문정": (37.4858, 127.1225),
    "장지": (37.4787, 127.1261), "복정": (37.4700, 127.1266), "모란": (37.4321, 127.1290),

    # 9호선
    "김포공항": (37.5624, 126.8013), "마곡나루": (37.5667, 126.8272), "가양": (37.5613, 126.8544),
    "염창": (37.5469, 126.8749), "당산": (37.5343, 126.9022), "국회의사당": (37.5281, 126.9178),
    "여의도": (37.5215, 126.9243), "노량진": (37.5142, 126.9424), "흑석": (37.5087, 126.9637),
    "동작": (37.5028, 126.9793), "구반포": (37.5013, 126.9873), "신반포": (37.5034, 126.9959),
    "고속터미널": (37.5049, 127.0049), "신논현": (37.5045, 127.0250), "언주": (37.5072, 127.0338),
    "선정릉": (37.5102, 127.0438), "삼성중앙": (37.5129, 127.0530), "봉은사": (37.5142, 127.0602),
    "종합운동장": (37.5109, 127.0736), "석촌": (37.5054, 127.1069), "올림픽공원": (37.5162, 127.1309),

    # 경의중앙 / 수인분당 / 신분당 등 주요 환승
    "한남": (37.5294, 127.0082), "서빙고": (37.5195, 126.9885), "이촌": (37.5222, 126.9743),
    "옥수": (37.5414, 127.0178), "응봉": (37.5503, 127.0345), "서울숲": (37.5436, 127.0446),
    "압구정로데오": (37.5273, 127.0405), "한티": (37.4962, 127.0528), "도곡": (37.4902, 127.0551),
    "구룡": (37.4868, 127.0588), "개포동": (37.4891, 127.0661), "대모산입구": (37.4913, 127.0727),
    "수서": (37.4873, 127.1018), "판교": (37.3947, 127.1112), "서현": (37.3837, 127.1222),
    "정자": (37.3670, 127.1081), "미금": (37.3500, 127.1089), "오리": (37.3398, 127.1095),
    "죽전": (37.3247, 127.1073), "보정": (37.3129, 127.1082)
}

def get_fuzzy_coordinate(place_name: str):
    for key, coords in FALLBACK_COORDINATES.items():
        if key in place_name: return coords
    return 0.0, 0.0

def find_nearest_hotspot_local(lat: float, lng: float):
    min_dist = float('inf')
    best_place = "중간지점"
    for name, coords in FALLBACK_COORDINATES.items():
        dist = (coords[0] - lat)**2 + (coords[1] - lng)**2
        if dist < min_dist:
            min_dist = dist
            best_place = name
    return best_place

# 🌟 [신규 함수] ODsay API를 활용한 소요 시간 계산
def get_transit_time(sx, sy, ex, ey):
    try:
        url = "https://api.odsay.com/v1/api/searchPubTransPathT"
        params = {
            "SX": sx, "SY": sy, "EX": ex, "EY": ey,
            "apiKey": ODSAY_API_KEY
        }
        res = requests.get(url, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and "path" in data["result"]:
                return data["result"]["path"][0]["info"]["totalTime"]
    except:
        pass
    return 9999

# 🌟 [핵심 함수] 3개의 추천 지역 산출 (시간순 Top 2 + 지리적 1)
def find_top_3_midpoints_odsay(participants):
    if not participants: return [("서울 시청", 37.5665, 126.9780)]

    # 1. 지리적 중심(Center) 계산
    avg_lat = sum(p['lat'] for p in participants) / len(participants)
    avg_lng = sum(p['lng'] for p in participants) / len(participants)

    # 2. 중심에서 직선 거리로 가까운 지하철역 7개 추리기 (1차 필터링)
    candidates = []
    for name, coords in FALLBACK_COORDINATES.items():
        dist = (coords[0] - avg_lat)**2 + (coords[1] - avg_lng)**2
        candidates.append((dist, name, coords))
    
    candidates.sort(key=lambda x: x[0])
    top_candidates = candidates[:7]

    # 3. ODsay API로 실제 소요 시간 계산
    scored_candidates = []
    for _, name, coords in top_candidates:
        max_time_for_this_station = 0
        for p in participants:
            # 내 위치와 후보역 사이 시간 계산
            time_mins = get_transit_time(p['lng'], p['lat'], coords[1], coords[0])
            if time_mins > max_time_for_this_station:
                max_time_for_this_station = time_mins
        
        # (최대 소요시간, 역이름, 좌표) 저장
        scored_candidates.append((max_time_for_this_station, name, coords))

    # 4. 시간 적게 걸리는 순서로 정렬
    scored_candidates.sort(key=lambda x: x[0])

    # 5. 결과 조합 (Top 2 + 지리적 중간)
    final_regions = []
    
    # 1순위, 2순위 추가
    for i in range(min(2, len(scored_candidates))):
        c = scored_candidates[i]
        final_regions.append((c[1], c[2][0], c[2][1])) # name, lat, lng

    # 3순위 (지리적 중간 or 3등)
    # 지리적 중심에서 가장 가까운 역 이름을 다시 찾음
    geo_name = find_nearest_hotspot_local(avg_lat, avg_lng)
    
    # 이미 1,2순위에 있으면 3등을 넣음
    existing_names = [r[0] for r in final_regions]
    if geo_name not in existing_names:
        coords = FALLBACK_COORDINATES.get(geo_name, (avg_lat, avg_lng))
        final_regions.append((geo_name, coords[0], coords[1]))
    elif len(scored_candidates) > 2:
        c = scored_candidates[2]
        final_regions.append((c[1], c[2][0], c[2][1]))
    
    return final_regions

# --- Request Models ---
class RecommendRequest(BaseModel):
    users: List[Any] = []; purpose: str = "식사"; location_name: str = ""
    friend_location_manual: Optional[str] = None; manual_locations: List[str] = [] 
    user_selected_tags: List[str] = []; current_lat: float = 37.566
    current_lng: float = 126.978; transport_mode: str = "subway"; room_id: Optional[str] = None
class NlpRequest(BaseModel): text: str
class ParticipantSchema(BaseModel): id: int; name: str; lat: float; lng: float; transport: str = "subway"; history_poi_ids: List[int] = []
class MeetingFlowRequest(BaseModel): room_id: Optional[str] = None; participants: List[ParticipantSchema] = []; purpose: str = "식사"; user_tags: List[str] = []; existing_midpoints: Optional[List[Dict[str, Any]]] = None; days_to_check: int = 7; manual_locations: List[str] = []
class EventSchema(BaseModel): id: Optional[str] = None; user_id: int; title: str; date: str; time: str; duration_hours: float = 1.5; location_name: Optional[str] = None; purpose: str; model_config = ConfigDict(from_attributes=True)
class AvailabilityRequest(BaseModel): user_ids: List[int]; days_to_check: int = 7

# --- Helper Functions ---
def save_place_to_db(db: Session, poi_list: List[Any]):
    for p in poi_list:
        existing = db.query(models.Place).filter(models.Place.name == p.name).first()
        is_duplicate = False
        target_lat, target_lng = float(p.location[0]), float(p.location[1])
        if existing:
            if abs(existing.lat - target_lat) < 0.0005 and abs(existing.lng - target_lng) < 0.0005: is_duplicate = True
        if not is_duplicate:
            addr = getattr(p, 'address', '주소 정보 없음')
            new_place = models.Place(name=p.name, category=p.category, tags=p.tags, lat=target_lat, lng=target_lng, wemeet_rating=p.avg_rating, address=addr)
            db.add(new_place)
    try: db.commit()
    except: db.rollback()

def search_places_in_db(db: Session, region_name: str, keywords: List[str], allowed_types: List[str]) -> List[Any]:
    lat, lng = data_provider.get_coordinates(region_name)
    if lat == 0.0: lat, lng = get_fuzzy_coordinate(region_name)
    if lat == 0.0: return []

    lat_min, lat_max = lat - 0.02, lat + 0.02
    lng_min, lng_max = lng - 0.02, lng + 0.02

    places_in_range = db.query(models.Place).filter(models.Place.lat.between(lat_min, lat_max), models.Place.lng.between(lng_min, lng_max)).all()
    candidates = []
    
    for p in places_in_range:
        dist = ((p.lat - lat)**2 + (p.lng - lng)**2)**0.5
        if dist > 0.02: continue 
        is_keyword_match = False
        tags_list = p.tags if isinstance(p.tags, list) else []
        for kw in keywords:
            if kw in p.name or any(kw in t for t in tags_list): is_keyword_match = True; break
        if is_keyword_match: pass
        elif allowed_types:
            if p.category not in allowed_types: continue
        candidates.append(agora_algo.POI(id=p.id, name=p.name, category=p.category, tags=p.tags, location=np.array([p.lat, p.lng]), price_level=2, avg_rating=p.wemeet_rating or 4.0))
    return candidates

def expand_tags_to_keywords(purpose: str, user_tags: List[str], region_name: str = "") -> List[str]:
    keywords = []
    base_keywords = []
    if user_tags:
        for tag in user_tags:
            if tag in TAG_KEYWORD_EXPANSIONS: base_keywords.extend(TAG_KEYWORD_EXPANSIONS[tag][:5])
            base_keywords.append(tag)
    else: base_keywords = PURPOSE_CONFIG.get(purpose, {}).get("keywords", ["맛집"])
    
    if region_name and region_name not in ["내 주변", "중간지점", "지리적 중간"]:
        clean_region = region_name.split('(')[0].strip()
        keywords = [f"{clean_region} {kw}" for kw in base_keywords]
    else: keywords = base_keywords
    return list(dict.fromkeys(keywords))

def _format_pois(pois):
    return [{"id": p.id, "name": p.name, "category": p.category, "score": max(0.1, p.avg_rating), "tags": p.tags, "location": [p.location[0], p.location[1]]} for p in pois]

def compute_availability_slots(user_ids: List[int], days_to_check: int, db: Session, required_duration: float = 1.5) -> List[str]:
    events = db.query(models.Event).filter(models.Event.user_id.in_(user_ids)).all()
    booked_slots = set()
    for ev in events:
        try:
            start_dt = datetime.strptime(f"{ev.date} {ev.time}", "%Y-%m-%d %H:%M")
            blocks = int(ev.duration_hours * 2)
            curr = start_dt
            for _ in range(blocks): booked_slots.add(curr.strftime("%Y-%m-%d %H:%M")); curr += timedelta(minutes=30)
        except: continue
    avail = []
    curr_date = datetime.now().date(); end_date = curr_date + timedelta(days=days_to_check)
    while curr_date <= end_date:
        for h in range(11, 22): 
            for m in [0, 30]:
                start_check = datetime.combine(curr_date, time(h, m))
                if start_check < datetime.now(): continue
                if start_check.strftime("%Y-%m-%d %H:%M") not in booked_slots: avail.append(start_check.strftime("%Y-%m-%d %H:%M"))
        curr_date += timedelta(days=1)
    return avail

# --- Core Logic ---
def run_general_search(req: RecommendRequest, db: Session):
    search_query = req.location_name
    if not search_query or search_query in ["내 위치", "중간지점", ""]:
        return [{ "region_name": "내 주변", "lat": req.current_lat, "lng": req.current_lng, "transit_info": {"avg_time": 0, "details": []}, "places": [] }]
    lat, lng = data_provider.get_coordinates(search_query)
    if lat == 0.0: lat, lng = get_fuzzy_coordinate(search_query)
    if lat != 0.0:
        keywords = expand_tags_to_keywords(req.purpose, req.user_selected_tags, search_query)
        pois = search_places_in_db(db, search_query, keywords, None)
        if len(pois) < 5:
            api_pois = data_provider.search_places_all_queries(keywords, search_query, lat, lng, allowed_types=None)
            save_place_to_db(db, api_pois)
            existing_names = {p.name for p in pois}
            for p in api_pois:
                if p.name not in existing_names: pois.append(p)
        return [{ "region_name": search_query, "lat": lat, "lng": lng, "transit_info": {"avg_time": 0, "details": []}, "places": _format_pois(pois) }]
    return []

def run_group_recommendation(req: RecommendRequest, db: Session):
    participants = []
    for u in req.users:
        try:
            uid = u.get("id")
            db_user = db.query(models.User).filter(models.User.id == uid).first() if uid else None
            if db_user: participants.append({ "id": db_user.id, "name": db_user.name, "lat": db_user.lat, "lng": db_user.lng, "preferences": db_user.preferences or {} })
            else:
                loc = u.get('location', {})
                participants.append({ "id": u.get("id", 0), "name": u.get("name", "User"), "lat": float(loc.get('lat', 0)), "lng": float(loc.get('lng', 0)), "preferences": {} })
        except: continue
        
    if req.manual_locations:
        for idx, loc_name in enumerate(req.manual_locations):
            if loc_name.strip():
                lat, lng = data_provider.get_coordinates(loc_name)
                if lat != 0.0: participants.append({"id": 9000+idx, "name": loc_name, "lat": lat, "lng": lng, "preferences": {}})
    
    if req.friend_location_manual:
        lat, lng = data_provider.get_coordinates(req.friend_location_manual)
        if lat != 0.0: participants.append({"id": 9999, "name": req.friend_location_manual, "lat": lat, "lng": lng, "preferences": {}})

    regions = []
    if len(participants) > 1:
        try:
            # 🌟 [수정] Top 3 (시간 1, 2순위 + 지리적) 추천 로직 적용
            top_regions = find_top_3_midpoints_odsay(participants)
            for name, lat, lng in top_regions:
                regions.append({"region_name": name, "lat": lat, "lng": lng})
        except: pass
    else:
         regions = [{"region_name": "서울 시청", "lat": 37.5665, "lng": 126.9780}]
    
    config = PURPOSE_CONFIG.get(req.purpose, PURPOSE_CONFIG["식사"])
    allowed_types = config.get("allowed", ["restaurant"])
    if "비즈니스" in req.purpose and any(x in str(req.user_selected_tags) for x in ["회의", "워크샵", "스터디"]): allowed_types = ["workspace"]

    final_response = []
    for region in regions:
        try:
            r_name = region.get('region_name', '중간지점').split('(')[0].strip()
            final_keywords = expand_tags_to_keywords(req.purpose, req.user_selected_tags, r_name)
            
            pois = search_places_in_db(db, r_name, final_keywords, allowed_types)
            if len(pois) < 5:
                api_pois = data_provider.search_places_all_queries(final_keywords, r_name, region.get("lat"), region.get("lng"), allowed_types=allowed_types)
                save_place_to_db(db, api_pois)
                existing_names = {p.name for p in pois}
                for p in api_pois:
                    if p.name not in existing_names: pois.append(p)

            algo_users = [agora_algo.UserProfile(id=p.get('id',0), preferences=p.get('preferences', {}), history=[]) for p in participants]
            engine = agora_algo.AdvancedRecommender(algo_users, pois)
            results = engine.recommend(req.purpose, np.array([region.get("lat"), region.get("lng")]), req.user_selected_tags)
            
            formatted_places = [{"id": p.id, "name": p.name, "category": p.category, "score": max(0.1, round(float(s), 1)), "tags": p.tags, "location": [p.location[0], p.location[1]]} for p, s in results[:10]]
            final_response.append({ "region_name": region['region_name'], "lat": region["lat"], "lng": region["lng"], "transit_info": region.get("transit_info"), "places": formatted_places })
        except: continue

    return final_response

class MeetingFlowEngine:
    def __init__(self, provider: RealDataProvider): self.provider = provider
    
    def _rank_time_slots(self, slots: List[str], purpose: str) -> List[str]:
        if not slots: return []
        def get_score(slot_str):
            dt = datetime.strptime(slot_str, "%Y-%m-%d %H:%M"); h = dt.hour; score = 0
            days_diff = (dt.date() - datetime.now().date()).days; score -= days_diff * 2
            if "식사" in purpose: 
                if 11 <= h <= 13: score += 50
                elif 18 <= h <= 19: score += 60 
            return score
        return sorted(slots, key=get_score, reverse=True)

    def plan_meeting(self, req: MeetingFlowRequest, db: Session) -> Dict[str, Any]:
        part_dicts = []
        if req.room_id:
             try:
                 room = db.query(models.Community).filter(models.Community.id == str(req.room_id)).first()
                 if room and room.member_ids:
                     users = db.query(models.User).filter(models.User.id.in_(room.member_ids)).all()
                     for u in users: part_dicts.append({ "id": u.id, "name": u.name, "lat": u.lat, "lng": u.lng, "preferences": u.preferences or {} })
             except: pass

        if req.participants:
            for p in req.participants: 
                db_user = db.query(models.User).filter(models.User.id == p.id).first()
                part_dicts.append({"id": p.id, "name": p.name, "lat": p.lat, "lng": p.lng, "preferences": db_user.preferences if db_user else {}})
            
        if req.manual_locations:
            for idx, loc_name in enumerate(req.manual_locations):
                if loc_name.strip():
                    lat, lng = data_provider.get_coordinates(loc_name)
                    if lat != 0.0: part_dicts.append({"id": 9000+idx, "name": loc_name, "lat": lat, "lng": lng, "preferences": {}})

        regions = []
        if len(part_dicts) > 1:
            try:
                # 🌟 AI 플래너도 동일하게 Top 3 사용
                top_regions = find_top_3_midpoints_odsay(part_dicts)
                for name, lat, lng in top_regions:
                    regions.append({"region_name": name, "lat": lat, "lng": lng})
            except: pass
        else:
             regions = [{"region_name": "서울 시청", "lat": 37.5665, "lng": 126.9780}]
        
        recommendations = []
        config = PURPOSE_CONFIG.get(req.purpose, PURPOSE_CONFIG["식사"])
        allowed_types = config.get("allowed", ["restaurant"])
        if "비즈니스" in req.purpose and any(x in str(req.user_tags) for x in ["회의", "워크샵", "스터디"]): allowed_types = ["workspace"]

        for region in regions:
            r_name = region.get('region_name', '중간지점').split('(')[0].strip()
            final_keywords = expand_tags_to_keywords(req.purpose, req.user_tags, r_name)
            
            pois = search_places_in_db(db, r_name, final_keywords, allowed_types)
            if len(pois) < 5:
                api_pois = self.provider.search_places_all_queries(final_keywords, r_name, region.get("lat"), region.get("lng"), allowed_types=allowed_types)
                save_place_to_db(db, api_pois)
                existing_names = {p.name for p in pois}
                for p in api_pois:
                    if p.name not in existing_names: pois.append(p)

            algo_users = [agora_algo.UserProfile(id=p.get('id',0), preferences=p.get('preferences', {}), history=[]) for p in part_dicts]
            try:
                engine = agora_algo.AdvancedRecommender(algo_users, pois)
                results = engine.recommend(req.purpose, np.array([region.get("lat"), region.get("lng")]), req.user_tags)
                recs = [{"id": p.id, "name": p.name, "category": p.category, "score": float(s), "tags": p.tags, "location": [p.location[0], p.location[1]]} for p, s in results[:10]]
            except: recs = []
            recommendations.append({**region, "name": r_name, "recommendations": recs})
        
        user_ids = [p.get('id') for p in part_dicts if p.get('id')]
        target_duration = PURPOSE_DURATIONS.get(req.purpose, 1.5)
        raw_availability = compute_availability_slots(user_ids, req.days_to_check, db, required_duration=target_duration)
        ranked_availability = self._rank_time_slots(raw_availability, req.purpose)
        final_top3 = ranked_availability[:3]
        if not final_top3: final_top3 = [(datetime.now() + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M")]
        
        cards = []
        for i, time_slot in enumerate(final_top3):
            place = {"name": "장소 미정", "tags": []}; region_name = "중간지점"
            if recommendations:
                rec_idx = i % len(recommendations)
                target_region = recommendations[rec_idx]
                region_name = target_region.get("name", target_region.get("region_name", "추천 지역"))
                if target_region.get("recommendations"): place = target_region["recommendations"][0]
            cards.append({"time": time_slot, "region": region_name, "place": place})
        return {"cards": cards, "all_available_slots": sorted(raw_availability)}

# --- Endpoints ---
@router.get("/api/places/search")
def search_places_endpoint(query: str = Query(..., min_length=1)):
    try:
        results = []
        for name, coords in FALLBACK_COORDINATES.items():
            if query in name: results.append({ "title": name, "address": "주요 지하철역/거점", "lat": coords[0], "lng": coords[1] })
        return results[:10]
    except: return []

@router.post("/api/recommend")
def get_recommendation(req: RecommendRequest, db: Session = Depends(get_db)):
    is_group_mode = (len(req.users) > 1 or len(req.manual_locations) > 0 or (req.friend_location_manual and req.friend_location_manual.strip() != ""))
    if is_group_mode: return run_group_recommendation(req, db)
    return run_general_search(req, db)

@router.post("/api/meeting-flow")
def run_meeting_flow(req: MeetingFlowRequest, db: Session = Depends(get_db)):
    engine_instance = MeetingFlowEngine(data_provider)
    return engine_instance.plan_meeting(req, db)

@router.post("/api/ai/parse-schedule")
def parse_schedule_endpoint(req: NlpRequest):
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        prompt = f"Extract JSON (title, date YYYY-MM-DD, time HH:MM, location_name, purpose) from: '{req.text}'. Current: {now}. Return JSON string only."
        response = model.generate_content(prompt)
        return json.loads(response.text.replace("```json", "").replace("```", "").strip())
    except: return { "title": "새 일정", "date": datetime.now().strftime("%Y-%m-%d"), "time": "19:00", "location_name": "미정", "purpose": "식사" }

@router.post("/api/events", response_model=EventSchema)
def create_event(event: EventSchema, db: Session = Depends(get_db)):
    from uuid import uuid4
    db_event = models.Event(id=str(uuid4()), user_id=event.user_id, title=event.title, date=event.date, time=event.time, duration_hours=event.duration_hours, location_name=event.location_name, purpose=event.purpose)
    db.add(db_event); db.commit(); db.refresh(db_event)
    return db_event

@router.get("/api/events", response_model=List[EventSchema])
def get_events(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Event).filter(models.Event.user_id == current_user.id).all()

@router.put("/api/events/{event_id}")
def update_event(event_id: str, updated: EventSchema, db: Session = Depends(get_db)):
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev: raise HTTPException(status_code=404, detail="Not found")
    ev.title = updated.title; ev.date = updated.date; ev.time = updated.time; ev.location_name = updated.location_name; ev.purpose = updated.purpose; db.commit(); return ev
@router.delete("/api/events/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    ev = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not ev: raise HTTPException(status_code=404, detail="Not found")
    db.delete(ev); db.commit(); return {"detail": "Deleted"}
@router.post("/api/group-availability")
def group_availability(req: AvailabilityRequest, db: Session = Depends(get_db)):
    avail = compute_availability_slots(req.user_ids, req.days_to_check, db)
    return {"available_slots": avail, "user_ids": req.user_ids}