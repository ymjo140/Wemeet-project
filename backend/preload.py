import sys
import os

# 🌟 [핵심] 시스템 경로 자동 설정 (Import Error 방지)
# 현재 파일(preload.py)이 있는 폴더(backend)를 파이썬 검색 경로에 강제 추가합니다.
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

import time
import random
import requests
import re
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import List, Tuple

# 🌟 모듈 임포트
try:
    import models
    from database import Base, DATABASE_URL
    from constants import NAVER_SEARCH_ID, NAVER_SEARCH_SECRET, NAVER_MAP_ID, NAVER_MAP_SECRET
except ImportError as e:
    print(f"❌ 임포트 오류: {e}")
    print("👉 'backend' 폴더 안에 'models.py', 'database.py', 'constants.py'가 있는지 확인해주세요.")
    sys.exit(1)

# --- 설정 ---
SEARCH_API_URL = "https://openapi.naver.com/v1/search/local.json"
GEOCODE_API_URL = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"

# DB 연결
try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    print(f"❌ 데이터베이스 연결 오류: {e}")
    print("👉 .env 파일의 DATABASE_URL이 정확한지 확인해주세요.")
    sys.exit(1)

# 🌟 [전체 키워드]
TARGET_KEYWORDS_DICT = {
    "한식": ["한식", "한정식", "솥밥", "갈비", "불고기", "보쌈", "한우"],
    "양식": ["양식", "파스타", "스테이크", "브런치", "이탈리안", "뇨끼", "라자냐", "아메리칸", "이태리"],
    "일식": ["일식", "스시", "라멘", "돈카츠", "돈까스", "우동", "가이세키", "오마카세", "이자카야", "일식코스", "후토마키"],
    "중식": ["중식", "중국요리", "짜장면", "짬뽕", "탕수육", "중식당", "코스요리", "딤섬", "훠궈"],
    "식사미팅": ["룸식당", "한정식", "일식코스", "호텔다이닝", "조용한식당", "접대장소"],
    "술": ["이자카야", "와인바", "위스키바", "프라이빗룸"],
    "커피챗": ["호텔라운지", "조용한카페", "비즈니스카페", "대형카페", "로스터리"],
    "회의": ["회의실", "미팅룸", "세미나실", "공간대여", "스페이스클라우드", "쉐어잇", "비즈니스센터", "공유오피스"],
    "워크샵": ["파티룸", "공간대여", "워크샵장소", "스튜디오", "아워플레이스", "렌탈스튜디오", "세미나실"],
    "문화생활": ["영화관", "미술관", "박물관", "전시회", "공연장", "연극", "뮤지컬", "아트센터", "갤러리", "축제"],
    "영화관": ["CGV", "롯데시네마", "메가박스", "독립영화관", "자동차극장", "극장"],
    "전시회": ["미술관", "박물관", "갤러리", "전시", "팝업스토어", "소품샵"],
    "액티비티": ["방탈출", "보드게임카페", "볼링장", "오락실", "VR체험", "만화카페", "노래방", "공방", "원데이클래스"],
    "방탈출": ["방탈출", "방탈출카페", "이스케이프", "비트포비아", "키이스케이프"],
    "조용한": ["룸식당", "프라이빗", "칸막이", "방음", "조용한카페"],
    "주차": ["주차가능", "발렛파킹", "무료주차"],
    "고급진": ["파인다이닝", "호텔", "오마카세"],
    "가성비": ["저렴한", "착한가격", "무한리필"]
}

# 🌟 [전체 지역]
TARGET_REGIONS = [
    "서울역", "시청", "종각", "종로3가", "종로5가", "동대문", "동묘앞", "신설동", "제기동",
    "청량리", "회기", "용산", "노량진", "영등포", "신도림", "구로", "부천", "부평", "안양", "수원",
    "강남", "역삼", "신논현", "삼성", "잠실", "건대입구", "성수", "왕십리", "을지로3가", "을지로입구",
    "홍대입구", "합정", "신촌", "이대", "당산", "구로디지털단지", "신림", "사당", "서초", "교대",
    "연신내", "불광", "경복궁", "안국", "충무로", "약수", "옥수", "압구정", "신사", "고속터미널", "양재", "수서",
    "노원", "창동", "성신여대입구", "혜화", "명동", "회현", "삼각지", "이촌", "이수", "과천", "범계",
    "김포공항", "여의도", "공덕", "광화문", "청구", "군자", "천호", "올림픽공원",
    "이태원", "한강진", "안암", "고려대", "석계", "망원",
    "강남구청", "논현", "내방", "가산디지털단지", "철산", "상봉",
    "암사", "석촌", "가락시장", "문정", "모란",
    "마곡나루", "선정릉", "봉은사", "종합운동장",
    "판교", "분당", "일산", "송도", "의정부"
]

class Preloader:
    def __init__(self):
        self.db = SessionLocal()

    def get_coordinates(self, address: str) -> Tuple[float, float]:
        if not NAVER_MAP_ID: return 0.0, 0.0
        headers = { "X-NCP-APIGW-API-KEY-ID": NAVER_MAP_ID, "X-NCP-APIGW-API-KEY": NAVER_MAP_SECRET }
        try:
            resp = requests.get(GEOCODE_API_URL, headers=headers, params={"query": address})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("addresses"):
                    return float(data["addresses"][0]["y"]), float(data["addresses"][0]["x"])
        except: pass
        return 0.0, 0.0

    def clean_html(self, text):
        return re.sub('<[^<]+?>', '', text)

    def analyze_attributes(self, title, category):
        """네이버 카테고리 + 사용자 정의 키워드 매칭"""
        tags = set()
        price = 2
        
        cats = category.split(">")
        for c in cats:
            c = c.strip()
            if c: tags.add(c)
        
        category_clean = category.replace(">", " ").strip()
        
        # 메인 카테고리 결정
        final_cat = "restaurant"
        if any(k in category_clean for k in ["카페", "커피", "디저트", "베이커리"]): final_cat = "cafe"
        elif any(k in category_clean for k in ["술집", "주점", "이자카야", "바", "호프", "포차"]): final_cat = "pub"; price = 3
        elif any(k in category_clean for k in ["스터디", "독서실", "오피스", "회의", "공간대여"]): final_cat = "workspace"
        
        # 상세 키워드 매칭
        for key, keywords in TARGET_KEYWORDS_DICT.items():
            for kw in keywords:
                if kw in title or kw in category_clean:
                    tags.add(kw)
                    tags.add(key)
        
        return final_cat, list(tags)

    def save_to_db(self, item, lat, lng):
        title = self.clean_html(item['title'])
        
        # 중복 체크 (이름 + 좌표 50m 반경)
        existing = self.db.query(models.Place).filter(models.Place.name == title).all()
        for ex in existing:
            if abs(ex.lat - lat) < 0.0005 and abs(ex.lng - lng) < 0.0005:
                return # 중복

        category_raw = item.get('category', '')
        final_cat, tags = self.analyze_attributes(title, category_raw)
        
        address = item.get('roadAddress') or item.get('address') or ""
        
        new_place = models.Place(
            name=title,
            category=final_cat,
            address=address,
            lat=lat,
            lng=lng,
            tags=tags,
            wemeet_rating=round(random.uniform(3.5, 5.0), 1),
            external_link=item.get('link')
        )
        self.db.add(new_place)
        try:
            self.db.commit()
            print(f"  ✅ 저장: {title} ({final_cat})")
        except Exception as e:
            self.db.rollback()

    def run(self):
        all_keywords = list(set([k for sublist in TARGET_KEYWORDS_DICT.values() for k in sublist]))
        print(f"🚀 [데이터 수집 시작] 지역: {len(TARGET_REGIONS)}개 / 키워드: {len(all_keywords)}개")
        
        total_saved = 0
        
        for region in TARGET_REGIONS:
            print(f"\n📍 [{region}] 탐색 중...")
            
            # API 쿼터 절약을 위해 각 지역별로 키워드를 랜덤하게 5개씩만 뽑아서 검색하거나,
            # 전체를 돌리려면 시간이 오래 걸립니다. (여기서는 전체 리스트 중 대표 5개만 예시로 돕니다)
            # 만약 전체를 다 돌리고 싶으면 below list를 all_keywords로 바꾸세요.
            # 하지만 25,000건 제한 때문에 '맛집', '카페', '술집' 같은 대표 키워드 위주로 돌리는 게 안전합니다.
            
            search_keywords = ["맛집", "카페", "술집", "놀거리", "스터디카페"] 
            
            for keyword in search_keywords:
                query = f"{region} {keyword}"
                try:
                    headers = { "X-Naver-Client-Id": NAVER_SEARCH_ID, "X-Naver-Client-Secret": NAVER_SEARCH_SECRET }
                    resp = requests.get(SEARCH_API_URL, headers=headers, params={"query": query, "display": 5, "sort": "comment"}, timeout=3)
                    
                    if resp.status_code != 200: continue
                    items = resp.json().get('items', [])
                    
                    for item in items:
                        addr = item.get('roadAddress') or item.get('address')
                        if not addr: continue
                        lat, lng = self.get_coordinates(addr)
                        if lat == 0.0: continue
                        
                        self.save_to_db(item, lat, lng)
                        total_saved += 1
                    
                    time.sleep(0.05) 
                except Exception as e:
                    print(f"Error: {e}")
        
        print(f"\n✨ 총 {total_saved}개 장소 저장 완료!")

if __name__ == "__main__":
    models.Base.metadata.create_all(bind=engine)
    loader = Preloader()
    loader.run()