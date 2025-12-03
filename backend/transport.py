import math
import requests
import asyncio
from typing import List, Dict

class TransportEngine:
    # 서울/경기/인천 주요 거점 55곳 (좌표 데이터)
    SEOUL_HOTSPOTS = [
        {"name": "강남역", "lat": 37.498085, "lng": 127.027621, "lines": [2, "신분당"]},
        {"name": "신논현", "lat": 37.504598, "lng": 127.025060, "lines": [9, "신분당"]},
        {"name": "역삼", "lat": 37.500622, "lng": 127.036456, "lines": [2]},
        {"name": "삼성(코엑스)", "lat": 37.508823, "lng": 127.063166, "lines": [2]},
        {"name": "잠실(송파)", "lat": 37.513261, "lng": 127.100131, "lines": [2, 8]},
        {"name": "고속터미널", "lat": 37.504914, "lng": 127.004915, "lines": [3, 7, 9]},
        {"name": "교대", "lat": 37.493415, "lng": 127.014080, "lines": [2, 3]},
        {"name": "양재", "lat": 37.484147, "lng": 127.034631, "lines": [3, "신분당"]},
        {"name": "사당", "lat": 37.476553, "lng": 126.981550, "lines": [2, 4]},
        {"name": "천호", "lat": 37.538640, "lng": 127.123626, "lines": [5, 8]},
        {"name": "홍대입구", "lat": 37.557527, "lng": 126.924467, "lines": [2, "공항", "경의중앙"]},
        {"name": "합정", "lat": 37.548929, "lng": 126.916630, "lines": [2, 6]},
        {"name": "신촌", "lat": 37.555134, "lng": 126.936893, "lines": [2]},
        {"name": "연남동(가좌)", "lat": 37.568473, "lng": 126.915503, "lines": ["경의중앙"]},
        {"name": "여의도", "lat": 37.521569, "lng": 126.924311, "lines": [5, 9]},
        {"name": "영등포", "lat": 37.515504, "lng": 126.907628, "lines": [1]},
        {"name": "신도림", "lat": 37.508901, "lng": 126.891347, "lines": [1, 2]},
        {"name": "구로디지털단지", "lat": 37.485250, "lng": 126.901472, "lines": [2]},
        {"name": "마곡나루", "lat": 37.566774, "lng": 126.827271, "lines": [9, "공항"]},
        {"name": "당산", "lat": 37.534380, "lng": 126.902281, "lines": [2, 9]},
        {"name": "서울역", "lat": 37.555946, "lng": 126.972317, "lines": [1, 4, "공항", "KTX"]},
        {"name": "용산", "lat": 37.529849, "lng": 126.964561, "lines": [1, "경의중앙"]},
        {"name": "이태원", "lat": 37.534533, "lng": 126.994367, "lines": [6]},
        {"name": "한남", "lat": 37.529430, "lng": 127.009226, "lines": ["경의중앙"]},
        {"name": "종로3가", "lat": 37.571607, "lng": 126.991806, "lines": [1, 3, 5]},
        {"name": "을지로3가", "lat": 37.566295, "lng": 126.992670, "lines": [2, 3]},
        {"name": "광화문", "lat": 37.571005, "lng": 126.976883, "lines": [5]},
        {"name": "명동", "lat": 37.560997, "lng": 126.986325, "lines": [4]},
        {"name": "혜화(대학로)", "lat": 37.582193, "lng": 127.001915, "lines": [4]},
        {"name": "동대문", "lat": 37.571420, "lng": 127.009745, "lines": [1, 4]},
        {"name": "왕십리", "lat": 37.561268, "lng": 127.037103, "lines": [2, 5, "수인분당"]},
        {"name": "성수", "lat": 37.544581, "lng": 127.056035, "lines": [2]},
        {"name": "건대입구", "lat": 37.540693, "lng": 127.070230, "lines": [2, 7]},
        {"name": "청량리", "lat": 37.580178, "lng": 127.048547, "lines": [1, "경의중앙"]},
        {"name": "노원", "lat": 37.655128, "lng": 127.061368, "lines": [4, 7]},
        {"name": "창동", "lat": 37.653166, "lng": 127.047731, "lines": [1, 4]},
        {"name": "판교", "lat": 37.394761, "lng": 127.111217, "lines": ["신분당", "경강"]},
        {"name": "서현(분당)", "lat": 37.383052, "lng": 127.121750, "lines": ["수인분당"]},
        {"name": "정자", "lat": 37.367060, "lng": 127.108068, "lines": ["신분당", "수인분당"]},
        {"name": "야탑", "lat": 37.412505, "lng": 127.128661, "lines": ["수인분당"]},
        {"name": "모란", "lat": 37.432130, "lng": 127.129087, "lines": [8, "수인분당"]},
        {"name": "수원역", "lat": 37.265637, "lng": 127.000029, "lines": [1, "수인분당", "KTX"]},
        {"name": "광교중앙", "lat": 37.288617, "lng": 127.052062, "lines": ["신분당"]},
        {"name": "죽전", "lat": 37.324750, "lng": 127.107396, "lines": ["수인분당"]},
        {"name": "동탄", "lat": 37.199494, "lng": 127.096632, "lines": ["SRT", "GTX"]},
        {"name": "안양(안양역)", "lat": 37.401621, "lng": 126.922848, "lines": [1]},
        {"name": "범계", "lat": 37.389788, "lng": 126.950767, "lines": [4]},
        {"name": "인덕원", "lat": 37.401184, "lng": 126.976546, "lines": [4]},
        {"name": "부천", "lat": 37.484074, "lng": 126.782682, "lines": [1]},
        {"name": "부평", "lat": 37.489521, "lng": 126.724540, "lines": [1, "인천1"]},
        {"name": "송도(인천대입구)", "lat": 37.386647, "lng": 126.639283, "lines": ["인천1"]},
        {"name": "일산(정발산)", "lat": 37.659259, "lng": 126.773410, "lines": [3]},
        {"name": "대화", "lat": 37.676078, "lng": 126.747274, "lines": [3]},
        {"name": "구리", "lat": 37.603394, "lng": 127.143848, "lines": ["경의중앙", "8"]},
        {"name": "의정부", "lat": 37.738621, "lng": 127.046048, "lines": [1]}
    ]

    # ODsay API Key
    ODSAY_API_KEY = "ILj4gNSd6U8ZTMlQ52YyxA"
    ODSAY_URL = "https://api.odsay.com/v1/api/searchPubTransPathT"

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2):
        """직선 거리 계산 (API 실패 시 백업용)"""
        R = 6371
        dLat = math.radians(lat2 - lat1)
        dLon = math.radians(lon2 - lon1)
        a = math.sin(dLat/2) * math.sin(dLat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2) * math.sin(dLon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c * 1000 # 미터 단위

    @staticmethod
    def get_transit_time(start_lat, start_lng, end_lat, end_lng):
        """
        ODsay API를 통해 대중교통 소요 시간(분)을 가져옵니다.
        """
        try:
            params = {
                "SX": start_lng, "SY": start_lat,
                "EX": end_lng, "EY": end_lat,
                "apiKey": TransportEngine.ODSAY_API_KEY,
            }
            response = requests.get(TransportEngine.ODSAY_URL, params=params, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "path" in data["result"]:
                    # 최단 시간 경로의 소요 시간 (분) 반환
                    best_path = data["result"]["path"][0]
                    return best_path["info"]["totalTime"]
        except Exception: pass
        
        # 👇 [수정됨] 실패 시 직선거리 기반 추정 로직을 여기로 이동 (들여쓰기 수정)
        dist_m = TransportEngine._haversine(start_lat, start_lng, end_lat, end_lng)
        # 평균 시속 30km/h 가정 (도심) + 환승 15분 페널티
        return int((dist_m / 1000) * 2) + 15

    @staticmethod
    def find_best_midpoints(participants: List[Dict]) -> List[Dict]:
        """
        모든 참가자의 이동 시간 편차와 총합이 가장 적은 '최적의 중간 지점' TOP 3를 찾습니다.
        """
        if not participants: return []

        scored_candidates = []

        # 모든 후보지(Hotspots)에 대해 시뮬레이션
        for spot in TransportEngine.SEOUL_HOTSPOTS:
            times = []
            
            for p in participants:
                # 각 참가자 -> 후보지 소요시간 계산 (API 호출)
                duration = TransportEngine.get_transit_time(p["lat"], p["lng"], spot["lat"], spot["lng"])
                times.append(duration)

            avg_time = sum(times) / len(times)
            max_time = max(times)
            min_time = min(times)
            
            # [점수 알고리즘]
            # 1. 효율성: 평균 시간이 짧아야 함 (가중치 1.0)
            # 2. 공평성: 편차(최대-최소)가 적어야 함 (가중치 2.0 -> 불공평하면 크게 감점)
            std_dev = max_time - min_time
            score = avg_time + (std_dev * 2.0)

            scored_candidates.append({
                "region_name": spot["name"],
                "lat": spot["lat"],
                "lng": spot["lng"],
                "score": score,
                "transit_info": {
                    "avg_time": int(avg_time),
                    "details": [
                        {
                            "id": participants[i].get("id"),
                            "name": participants[i].get("name"),
                            "time": t,
                            "mode": "subway"
                        }
                        for i, t in enumerate(times)
                    ]
                }
            })
        
        # 점수가 낮을수록 좋음 (시간+편차가 적음)
        scored_candidates.sort(key=lambda x: x["score"])
        
        return scored_candidates[:3] # 상위 3개 추천

    @staticmethod
    def get_nearest_hotspot(lat: float, lng: float) -> str:
        """주어진 좌표에서 가장 가까운 주요 거점 이름을 반환"""
        nearest = None
        min_dist = float('inf')
        
        for spot in TransportEngine.SEOUL_HOTSPOTS:
            dist = TransportEngine._haversine(lat, lng, spot['lat'], spot['lng'])
            if dist < min_dist:
                min_dist = dist
                nearest = spot
        
        # 너무 멀면(5km 이상) 그냥 '중간지점'이라고 함
        if nearest and min_dist < 5000:
            return nearest['name']
        return "중간지점"