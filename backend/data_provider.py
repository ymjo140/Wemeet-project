import requests
import numpy as np
import random
import re
from typing import List
from algorithm import POI 

class RealDataProvider:
    def __init__(self, search_id: str, search_secret: str, map_id: str, map_secret: str):
        self.search_client_id = search_id
        self.search_client_secret = search_secret
        self.map_client_id = map_id
        self.map_client_secret = map_secret
        
        self.search_api_url = "https://openapi.naver.com/v1/search/local.json"
        self.geocode_api_url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"

        self.REGION_ADDRESS_MAP = {
            "약수": ["약수", "신당", "다산", "청구", "장충"],
            "한남": ["한남", "이태원", "보광", "서빙고"],
            "이태원": ["이태원", "한남", "경리단", "용산동"],
            "을지로": ["을지로", "저동", "초동", "충무로", "입정", "방산"],
            "종로": ["종로", "관철", "인사", "익선", "낙원"],
            "명동": ["명동", "남산", "회현", "소공", "충무로"],
            "홍대": ["서교", "동교", "연남", "합정", "상수", "망원"],
            "강남": ["역삼", "논현", "서초", "도곡", "삼성", "청담"],
            "성수": ["성수", "뚝섬", "서울숲", "송정"],
            "안암": ["안암", "제기", "종암", "고려대"],
            "동대문": ["창신", "숭인", "신당", "을지로6가", "광희"], 
            "신촌": ["신촌", "창천", "노고산", "대현", "연세"],
        }

    def _clean_html(self, text: str) -> str:
        return re.sub("<[^<]+?>", "", text)

    def _get_real_coordinates(self, address: str, fallback_lat: float, fallback_lng: float):
        """ 주소를 실제 위도/경도로 변환 (Geocoding API 사용) """
        if not self.map_client_id or not self.map_client_secret:
            return fallback_lat, fallback_lng
        headers = { "X-NCP-APIGW-API-KEY-ID": self.map_client_id, "X-NCP-APIGW-API-KEY": self.map_client_secret }
        try:
            resp = requests.get(self.geocode_api_url, headers=headers, params={"query": address}, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('addresses'):
                    return float(data['addresses'][0]['y']), float(data['addresses'][0]['x'])
        except: pass
        return fallback_lat + random.uniform(-0.002, 0.002), fallback_lng + random.uniform(-0.002, 0.002)

    def _analyze_attributes(self, title: str, category: str):
        category = category.replace(">", "")
        full_text = (title + " " + category).lower()
        tags = []
        internal_category = "restaurant"
        price_level = 3

        # 1. 공간 유형
        if any(k in full_text for k in ["회의", "미팅", "스터디룸", "공유오피스", "워크", "대관", "사무실"]):
            internal_category = "workspace"; tags.append("회의실")
        elif "카페" in full_text:
            internal_category = "cafe"; tags.append("카페")
        elif any(k in full_text for k in ["공원", "산책", "미술관", "전시", "축제"]):
            internal_category = "place"; tags.append("산책")
        
        # 2. 식당 종류
        elif any(k in full_text for k in ["오마카세", "코스", "파인다이닝", "호텔", "한정식", "고급"]):
            internal_category = "fine_dining"; tags.append("고급진"); price_level = 5
        elif any(k in full_text for k in ["이자카야", "술집", "포차", "맥주", "와인", "바(bar)", "호프"]):
            internal_category = "izakaya"; tags.append("술집"); price_level = 4
        
        # 3. 상세 태그
        if "한정식" in full_text or "백반" in full_text: tags.append("한식")
        if "파스타" in full_text or "스테이크" in full_text: tags.append("양식")
        if "룸" in full_text or "프라이빗" in full_text: tags.append("룸이있는")
        if "가성비" in full_text or "저렴" in full_text: tags.append("가성비좋은"); price_level = 1
        if "조용한" in full_text or "정숙" in full_text: tags.append("조용한")
        if "노포" in full_text or "오래된" in full_text: tags.append("노포감성")
        if "뷰" in full_text or "야경" in full_text: tags.append("뷰가좋은")
        if "인스타" in full_text or "감성" in full_text: tags.append("인스타감성")
        
        # 4. 정크 필터
        else:
            if any(k in full_text for k in ["국밥", "분식", "우동"]): price_level = 1
            if any(k in full_text for k in ["병원", "의원", "약국", "클리닉", "법무", "세무", "주차장", "ATM"]):
                 internal_category = "junk"

        return internal_category, list(set(tags)), price_level

    def search_places_all_queries(self, queries: List[str], location: str, center_lat: float, center_lng: float) -> List[POI]:
        if not self.search_client_id: return []

        headers = {
            "X-Naver-Client-Id": self.search_client_id,
            "X-Naver-Client-Secret": self.search_client_secret,
        }

        all_pois = []
        seen_titles = set()
        search_region_key = location.split()[0].replace("역", "")
        valid_address_keywords = self.REGION_ADDRESS_MAP.get(search_region_key, [search_region_key])

        for query in queries[:20]:
            params = {"query": query, "display": 20, "sort": "comment"} 
            try:
                response = requests.get(self.search_api_url, headers=headers, params=params, timeout=3)
                items = response.json().get('items', [])
                
                for item in items:
                    title = self._clean_html(item.get("title", ""))
                    
                    address_text = (item.get('roadAddress', '') + ' ' + item.get('address', '')).strip()
                    is_valid_location = False
                    for addr_kw in valid_address_keywords:
                        if addr_kw in address_text:
                            is_valid_location = True
                            break
                    if not is_valid_location: continue

                    if not title or title in seen_titles: continue
                    seen_titles.add(title)

                    cat_key, tags, price = self._analyze_attributes(title, item.get("category", ""))
                    if cat_key == "junk": continue

                    real_lat, real_lng = self._get_real_coordinates(address_text, center_lat, center_lng)

                    poi = POI(
                        id=random.randint(100000, 999999),
                        name=title,
                        category=cat_key,
                        tags=tags,
                        price_level=price,
                        location=np.array([real_lat, real_lng]),
                        avg_rating=round(random.uniform(3.5, 5.0), 1),
                    )
                    all_pois.append(poi)
            except Exception: continue

        return all_pois