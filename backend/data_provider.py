import requests
import numpy as np
import random
import re
from typing import List, Tuple
from algorithm import POI 

class RealDataProvider:
    def __init__(self, search_id: str, search_secret: str, map_id: str, map_secret: str):
        self.search_client_id = search_id
        self.search_client_secret = search_secret
        self.map_client_id = map_id
        self.map_client_secret = map_secret
        
        self.search_api_url = "https://openapi.naver.com/v1/search/local.json"
        self.geocode_api_url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"

    def get_coordinates(self, address: str) -> Tuple[float, float]:
        if not self.map_client_id: return 0.0, 0.0
        headers = { "X-NCP-APIGW-API-KEY-ID": self.map_client_id, "X-NCP-APIGW-API-KEY": self.map_client_secret }
        try:
            resp = requests.get(self.geocode_api_url, headers=headers, params={"query": address})
            if resp.status_code == 200:
                data = resp.json()
                if data.get("addresses"): return float(data["addresses"][0]["y"]), float(data["addresses"][0]["x"])
        except: pass
        return 0.0, 0.0

    def _clean_html(self, text):
        return re.sub('<[^<]+?>', '', text)

    def _get_real_coordinates(self, address, center_lat, center_lng):
        lat, lng = self.get_coordinates(address)
        if lat != 0.0: return lat, lng
        return center_lat + random.uniform(-0.002, 0.002), center_lng + random.uniform(-0.002, 0.002)

    # 🌟 [핵심 수정] 카테고리 분류 로직 (문화/액티비티 추가)
    def _analyze_attributes(self, title, category):
        tags = []
        price = 2
        cat_key = "junk" 
        
        title_clean = title.replace(" ", "")
        category_clean = category.replace(">", " ").strip()
        
        # 🎭 1. 문화생활 (Culture)
        culture_keywords = ["영화관", "극장", "미술관", "박물관", "전시", "공연", "아트", "갤러리", "CGV", "롯데시네마", "메가박스", "문화"]
        if any(kw in category_clean or kw in title_clean for kw in culture_keywords):
            cat_key = "culture"
            tags.append("문화생활")
            tags.append("데이트")
            if "영화" in category_clean or "시네마" in title_clean: tags.append("영화관")
            if "미술" in category_clean or "갤러리" in title_clean: tags.append("전시회")
            price = 3

        # 🎳 2. 액티비티/놀거리 (Activity)
        elif any(kw in category_clean or kw in title_clean for kw in ["방탈출", "보드게임", "볼링", "당구", "오락실", "VR", "노래방", "만화카페", "공방", "클래스", "체험", "공원", "산책"]):
            cat_key = "activity"
            tags.append("액티비티")
            tags.append("놀거리")
            if "방탈출" in title_clean: tags.append("방탈출")
            if "보드게임" in category_clean: tags.append("보드게임")
            if "공원" in category_clean: tags.append("산책")
            price = 2

        # 🏢 3. 워크스페이스
        elif any(kw in category_clean or kw in title_clean for kw in ["공간대여", "스터디", "오피스", "회의", "세미나", "사무실", "비즈니스", "파티룸", "스튜디오"]):
            cat_key = "workspace"
            tags.append("조용한")
            tags.append("회의실")
            price = 3

        # ☕ 4. 카페
        elif any(kw in category_clean for kw in ["카페", "커피", "디저트", "베이커리", "찻집"]):
            cat_key = "cafe"
            tags.append("카페")
            if "디저트" in category_clean: tags.append("디저트")
            price = 2

        # 🍺 5. 술집
        elif any(kw in category_clean for kw in ["술집", "주점", "이자카야", "포차", "바", "호프", "맥주", "와인", "Pub"]):
            cat_key = "pub"
            tags.append("술")
            tags.append("시끌벅적")
            price = 3

        # 🍽️ 6. 식당
        elif any(kw in category_clean for kw in ["음식점", "식당", "한식", "양식", "일식", "중식", "분식", "뷔페", "레스토랑", "고기"]):
            cat_key = "restaurant"
            tags.append("맛집")
            if "고기" in category_clean: tags.append("고기")
            price = 3
        
        return cat_key, list(set(tags)), price

    def search_places_all_queries(self, queries: List[str], region_name: str, center_lat: float, center_lng: float, allowed_types: List[str] = None) -> List[POI]:
        all_pois = []
        seen_titles = set()

        for query in queries[:15]: # 15개까지 검색
            try:
                final_query = f"{region_name.split('(')[0]} {query}"
                headers = { "X-Naver-Client-Id": self.search_client_id, "X-Naver-Client-Secret": self.search_client_secret }
                resp = requests.get(self.search_api_url, headers=headers, params={"query": final_query, "display": 10, "sort": "random"}, timeout=2)
                
                if resp.status_code != 200: continue
                
                items = resp.json().get('items', [])
                
                for item in items:
                    title = self._clean_html(item.get("title", ""))
                    cat_str = item.get("category", "")
                    
                    if not title or title in seen_titles: continue
                    seen_titles.add(title)
                    
                    cat_key, tags, price = self._analyze_attributes(title, cat_str)
                    
                    if cat_key == "junk": continue
                    
                    # 🌟 [핵심 수정] allowed_types 필터링 (OR 조건)
                    if allowed_types:
                         if cat_key in allowed_types: pass
                         # 예외: 사용자가 '데이트'를 원하는데 'culture'나 'activity'가 나오면 통과
                         elif "culture" in allowed_types and cat_key in ["culture", "activity", "cafe"]: pass 
                         else: continue

                    address = item.get('roadAddress', item.get('address', ''))
                    lat, lng = self._get_real_coordinates(address, center_lat, center_lng)
                    
                    all_pois.append(POI(
                        id=random.randint(100000, 999999),
                        name=title,
                        category=cat_key,
                        tags=tags,
                        price_level=price,
                        location=np.array([lat, lng]),
                        avg_rating=round(random.uniform(3.5, 5.0), 1)
                    ))
            except: continue
            
        return all_pois