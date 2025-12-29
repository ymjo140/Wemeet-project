import requests
import urllib.parse
import time
import json
import math
from typing import List, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import text
from pyproj import Proj, transform 

class PlaceInfo:
    def __init__(self, name, category, location, avg_rating=0.0, tags=None, address=None, routes=None):
        self.name = name
        self.category = category
        self.location = location 
        self.avg_rating = avg_rating
        self.tags = tags or []
        self.address = address or ""
        self.routes = routes or {} 

class RealDataProvider:
    def __init__(self):
        self.search_headers = {
            "X-Naver-Client-Id": "7hzPrrLNl9CqLaAffBDb", 
            "X-Naver-Client-Secret": "aijs1MO01i"
        }
        
        try:
            self.proj_katech = Proj('epsg:2097') 
            self.proj_wgs84 = Proj('epsg:4326')
            print("✅ [Init] 좌표 변환기 설정 완료")
        except Exception as e:
            print(f"⚠️ [Warning] pyproj 설정 실패: {e}")
            self.proj_katech = None
            self.proj_wgs84 = None

    def convert_katech_to_wgs84(self, mapx, mapy):
        try:
            if not self.proj_katech or not mapx or not mapy:
                return 0.0, 0.0
            mx, my = float(mapx), float(mapy)
            lng, lat = transform(self.proj_katech, self.proj_wgs84, mx, my)
            if not (33 < lat < 43) or not (124 < lng < 132):
                return 0.0, 0.0
            return lat, lng
        except Exception as e:
            return 0.0, 0.0

    def calculate_distance_km(self, lat1, lon1, lat2, lon2):
        R = 6371 
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = math.sin(d_lat / 2) * math.sin(d_lat / 2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(d_lon / 2) * math.sin(d_lon / 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def search_places_all_queries(self, queries: List[str], region_name: str, center_lat: float, center_lng: float, start_locations: List[Dict] = None, db: Session = None) -> List[PlaceInfo]:
        from ..repositories.meeting_repository import MeetingRepository
        repo = MeetingRepository()
        
        results = []
        seen_names = set()
        start_locations = start_locations or []

        # ✅ [수정 포인트 1] 모드 확인
        # region_name이 있으면 -> 추천 모드 (1km 제한)
        # region_name이 없으면 -> 일반 검색 모드 (거리 제한 없음)
        is_recommendation_mode = bool(region_name and region_name.strip())

        # ---------------------------------------------------------
        # ⚡ [Pre-fetch] 시간 정보 미리 조회
        # 추천 모드일 때만 실행 (일반 검색은 중심지가 없으므로 시간 계산 불가/불필요)
        # ---------------------------------------------------------
        preloaded_routes = {}
        
        if is_recommendation_mode and db and start_locations:
            print(f"⏳ [Pre-fetch] '{region_name}'까지의 소요시간 미리 조회 중...")
            for start in start_locations:
                s_name = start.get('name', '')
                if not s_name: continue
                
                try:
                    sql = text("""
                        SELECT total_time 
                        FROM public.travel_time_cache 
                        WHERE start_name = :start AND end_name = :end
                        LIMIT 1
                    """)
                    row = db.execute(sql, {"start": s_name, "end": region_name}).fetchone()
                    
                    if row:
                        preloaded_routes[s_name] = {
                            "time": row[0],
                            "transportation": "public",
                            "source": "db_cache"
                        }
                    else:
                        preloaded_routes[s_name] = {
                            "time": 0, 
                            "transportation": "unknown", 
                            "source": "not_found"
                        }
                except Exception as e:
                    # print(f"⚠️ DB Error for {s_name}: {e}")
                    preloaded_routes[s_name] = {"time": 0, "transportation": "error"}

        mode_str = f"'{region_name}' 주변 1km" if is_recommendation_mode else "일반(전국)"
        print(f"\n🚀 [Start] {mode_str} 검색 시작: {queries}")

        try:
            for q in queries:
                if len(results) >= 50: break
                
                # 일반 검색이면 region_name을 붙이지 않고 검색어만 사용
                search_query = f"{region_name} {q}" if is_recommendation_mode else q
                
                for start_idx in range(1, 100, 20): 
                    if len(results) >= 50: break
                    time.sleep(0.1) 
                    
                    url = f"https://openapi.naver.com/v1/search/local.json?query={urllib.parse.quote(search_query)}&display=20&start={start_idx}&sort=random"
                    
                    res = requests.get(url, headers=self.search_headers)
                    if res.status_code != 200: break

                    items = res.json().get('items', [])
                    if not items: break

                    for item in items:
                        clean_name = item['title'].replace('<b>', '').replace('</b>', '')
                        if clean_name in seen_names: continue
                        
                        address = item['roadAddress'] or item['address']
                        mapx = item.get('mapx')
                        mapy = item.get('mapy')
                        
                        lat, lng = 0.0, 0.0
                        if mapx and mapy:
                            lat, lng = self.convert_katech_to_wgs84(mapx, mapy)
                        
                        if lat == 0.0 or lng == 0.0: continue

                        # ✅ [수정 포인트 2] 거리 필터링 조건부 적용
                        if is_recommendation_mode:
                            # 추천 모드일 때만 1km 컷!
                            dist_from_center = self.calculate_distance_km(center_lat, center_lng, lat, lng)
                            if dist_from_center > 1.0: continue 
                        
                        seen_names.add(clean_name)
                        category = item['category'].split('>')[0] if item['category'] else "기타"
                        
                        # DB 저장
                        if db:
                            try:
                                if not repo.get_place_by_name(db, clean_name):
                                    repo.create_place(db, clean_name, category, lat, lng, [q], 0.0, address)
                                    db.commit()
                            except: 
                                db.rollback()

                        results.append(PlaceInfo(
                            name=clean_name, 
                            category=category, 
                            location=[lat, lng], 
                            avg_rating=0.0, 
                            tags=[q], 
                            address=address,
                            routes=preloaded_routes # 미리 조회된 시간 정보 (일반 검색이면 비어있음)
                        ))
                        
        except Exception as e:
            print(f"❌ [Error] {e}")
        
        print(f"🏁 [End] 총 {len(results)}개 장소 처리 완료")
        return results