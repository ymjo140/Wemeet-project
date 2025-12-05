import math
import requests
import asyncio
from typing import List, Dict

class TransportEngine:
    # 🌟 [대규모 확장] 서울/경기/인천 주요 거점 및 환승역 좌표 DB
    SEOUL_HOTSPOTS = [
        # --- 1. 서울 도심/중구/용산 (강북 핵심) ---
        {"name": "서울역", "lat": 37.5559, "lng": 126.9723},
        {"name": "용산역", "lat": 37.5298, "lng": 126.9645},
        {"name": "시청", "lat": 37.5657, "lng": 126.9769},
        {"name": "광화문", "lat": 37.5710, "lng": 126.9768},
        {"name": "종로3가", "lat": 37.5716, "lng": 126.9918},
        {"name": "을지로3가", "lat": 37.5662, "lng": 126.9926},
        {"name": "을지로입구", "lat": 37.5660, "lng": 126.9826},
        {"name": "명동", "lat": 37.5609, "lng": 126.9863},
        {"name": "충무로", "lat": 37.5612, "lng": 126.9942},
        {"name": "약수", "lat": 37.5543, "lng": 127.0107}, # 강남-강북 중간
        {"name": "동대문역사문화공원", "lat": 37.5656, "lng": 127.0089},
        {"name": "신당", "lat": 37.5656, "lng": 127.0197},
        {"name": "청구", "lat": 37.5602, "lng": 127.0138},
        {"name": "이태원", "lat": 37.5345, "lng": 126.9943},
        {"name": "한강진", "lat": 37.5396, "lng": 127.0017},
        {"name": "한남(경의중앙)", "lat": 37.5294, "lng": 127.0092},
        {"name": "삼각지", "lat": 37.5347, "lng": 126.9731},
        {"name": "숙대입구", "lat": 37.5448, "lng": 126.9715},

        # --- 2. 서울 강남/서초/송파 (강남 핵심) ---
        {"name": "강남역", "lat": 37.4980, "lng": 127.0276},
        {"name": "신논현", "lat": 37.5045, "lng": 127.0250},
        {"name": "논현", "lat": 37.5110, "lng": 127.0214},
        {"name": "신사", "lat": 37.5163, "lng": 127.0203},
        {"name": "압구정", "lat": 37.5270, "lng": 127.0284},
        {"name": "압구정로데오", "lat": 37.5273, "lng": 127.0404},
        {"name": "역삼", "lat": 37.5006, "lng": 127.0364},
        {"name": "선릉", "lat": 37.5044, "lng": 127.0489},
        {"name": "삼성(코엑스)", "lat": 37.5088, "lng": 127.0631},
        {"name": "잠실(송파구청)", "lat": 37.5132, "lng": 127.1001},
        {"name": "잠실새내", "lat": 37.5116, "lng": 127.0863},
        {"name": "종합운동장", "lat": 37.5109, "lng": 127.0736},
        {"name": "고속터미널", "lat": 37.5049, "lng": 127.0049},
        {"name": "교대", "lat": 37.4934, "lng": 127.0140},
        {"name": "서초", "lat": 37.4918, "lng": 127.0076},
        {"name": "양재", "lat": 37.4841, "lng": 127.0346},
        {"name": "매봉", "lat": 37.4869, "lng": 127.0467},
        {"name": "도곡", "lat": 37.4909, "lng": 127.0554},
        {"name": "수서", "lat": 37.4873, "lng": 127.1018},
        {"name": "천호", "lat": 37.5386, "lng": 127.1236},

        # --- 3. 서울 마포/서대문/은평 (서북권) ---
        {"name": "홍대입구", "lat": 37.5575, "lng": 126.9244},
        {"name": "합정", "lat": 37.5489, "lng": 126.9166},
        {"name": "상수", "lat": 37.5477, "lng": 126.9228},
        {"name": "망원", "lat": 37.5559, "lng": 126.9099},
        {"name": "신촌", "lat": 37.5551, "lng": 126.9368},
        {"name": "이대", "lat": 37.5567, "lng": 126.9460},
        {"name": "공덕", "lat": 37.5435, "lng": 126.9515}, # 중요 환승
        {"name": "마포", "lat": 37.5395, "lng": 126.9459},
        {"name": "디지털미디어시티", "lat": 37.5770, "lng": 126.9012},
        {"name": "연신내", "lat": 37.6190, "lng": 126.9210},
        {"name": "불광", "lat": 37.6104, "lng": 126.9298},

        # --- 4. 서울 영등포/동작/관악 (서남권) ---
        {"name": "여의도", "lat": 37.5215, "lng": 126.9243},
        {"name": "여의나루", "lat": 37.5271, "lng": 126.9329},
        {"name": "영등포", "lat": 37.5155, "lng": 126.9076},
        {"name": "영등포구청", "lat": 37.5249, "lng": 126.8959},
        {"name": "신도림", "lat": 37.5089, "lng": 126.8913},
        {"name": "구로디지털단지", "lat": 37.4852, "lng": 126.9014},
        {"name": "신림", "lat": 37.4842, "lng": 126.9297},
        {"name": "서울대입구", "lat": 37.4812, "lng": 126.9527},
        {"name": "사당", "lat": 37.4765, "lng": 126.9815},
        {"name": "이수(총신대입구)", "lat": 37.4862, "lng": 126.9819},
        {"name": "동작", "lat": 37.5028, "lng": 126.9802},
        {"name": "노량진", "lat": 37.5135, "lng": 126.9408},
        {"name": "당산", "lat": 37.5343, "lng": 126.9022},

        # --- 5. 서울 성동/광진/동대문/성북 (동북권) ---
        {"name": "왕십리", "lat": 37.5612, "lng": 127.0371},
        {"name": "성수", "lat": 37.5445, "lng": 127.0560},
        {"name": "뚝섬", "lat": 37.5474, "lng": 127.0473},
        {"name": "서울숲", "lat": 37.5436, "lng": 127.0446},
        {"name": "건대입구", "lat": 37.5406, "lng": 127.0702},
        {"name": "군자", "lat": 37.5571, "lng": 127.0794},
        {"name": "청량리", "lat": 37.5801, "lng": 127.0485},
        {"name": "회기", "lat": 37.5894, "lng": 127.0575},
        {"name": "안암(고대)", "lat": 37.5863, "lng": 127.0292},
        {"name": "혜화", "lat": 37.5822, "lng": 127.0019},
        {"name": "성신여대입구", "lat": 37.5926, "lng": 127.0170},
        {"name": "노원", "lat": 37.6551, "lng": 127.0613},
        {"name": "창동", "lat": 37.6531, "lng": 127.0477},
        {"name": "석계", "lat": 37.6148, "lng": 127.0656},
        {"name": "태릉입구", "lat": 37.6179, "lng": 127.0751},
        {"name": "옥수", "lat": 37.5414, "lng": 127.0178}, # 강남-강북 연결

        # --- 6. 경기 남부 (성남/수원/용인) ---
        {"name": "판교", "lat": 37.3947, "lng": 127.1112},
        {"name": "이매", "lat": 37.3955, "lng": 127.1282},
        {"name": "야탑", "lat": 37.4125, "lng": 127.1286},
        {"name": "서현", "lat": 37.3830, "lng": 127.1217},
        {"name": "정자", "lat": 37.3670, "lng": 127.1080},
        {"name": "미금", "lat": 37.3500, "lng": 127.1089},
        {"name": "오리", "lat": 37.3399, "lng": 127.1090},
        {"name": "죽전", "lat": 37.3247, "lng": 127.1073},
        {"name": "보정", "lat": 37.3133, "lng": 127.1081},
        {"name": "기흥", "lat": 37.2754, "lng": 127.1159},
        {"name": "수원역", "lat": 37.2656, "lng": 127.0000},
        {"name": "광교중앙", "lat": 37.2886, "lng": 127.0520},
        {"name": "동탄", "lat": 37.1994, "lng": 127.0966},

        # --- 7. 경기 서부/북부/인천 ---
        {"name": "안양", "lat": 37.4016, "lng": 126.9228},
        {"name": "범계", "lat": 37.3897, "lng": 126.9507},
        {"name": "평촌", "lat": 37.3942, "lng": 126.9638},
        {"name": "인덕원", "lat": 37.4011, "lng": 126.9765},
        {"name": "과천", "lat": 37.4330, "lng": 126.9965},
        {"name": "금정", "lat": 37.3722, "lng": 126.9434},
        {"name": "부천", "lat": 37.4840, "lng": 126.7826},
        {"name": "송내", "lat": 37.4876, "lng": 126.7536},
        {"name": "부평", "lat": 37.4895, "lng": 126.7245},
        {"name": "주안", "lat": 37.4649, "lng": 126.6791},
        {"name": "인천터미널", "lat": 37.4424, "lng": 126.6991},
        {"name": "송도(인천대입구)", "lat": 37.3866, "lng": 126.6392},
        {"name": "계양", "lat": 37.5715, "lng": 126.7361},
        {"name": "김포공항", "lat": 37.5624, "lng": 126.8013},
        {"name": "마곡나루", "lat": 37.5667, "lng": 126.8272},
        {"name": "일산(정발산)", "lat": 37.6592, "lng": 126.7734},
        {"name": "대화", "lat": 37.6760, "lng": 126.7472},
        {"name": "구리", "lat": 37.6033, "lng": 127.1438},
        {"name": "의정부", "lat": 37.7386, "lng": 127.0460},
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
        """ODsay API를 통해 대중교통 소요 시간(분)을 가져옵니다."""
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
                    return data["result"]["path"][0]["info"]["totalTime"]
        except Exception: pass
        
        # 실패 시 직선거리 기반 추정
        dist_m = TransportEngine._haversine(start_lat, start_lng, end_lat, end_lng)
        return int((dist_m / 1000) * 2) + 15

    @staticmethod
    def find_best_midpoints(participants: List[Dict]) -> List[Dict]:
        """모든 참가자의 이동 시간 편차와 총합이 가장 적은 '최적의 중간 지점' TOP 3를 찾습니다."""
        if not participants: return []

        scored_candidates = []

        for spot in TransportEngine.SEOUL_HOTSPOTS:
            times = []
            
            for p in participants:
                duration = TransportEngine.get_transit_time(p["lat"], p["lng"], spot["lat"], spot["lng"])
                times.append(duration)

            avg_time = sum(times) / len(times)
            max_time = max(times)
            min_time = min(times)
            
            std_dev = max_time - min_time
            score = avg_time + (std_dev * 2.0)

            scored_candidates.append({
                "region_name": spot["name"],
                "lat": spot["lat"],
                "lng": spot["lng"],
                "score": score,
                "transit_info": {
                    "avg_time": int(avg_time),
                    "details": [{"name": participants[i].get("name"), "time": t, "mode": "subway"} for i, t in enumerate(times)]
                }
            })
        
        scored_candidates.sort(key=lambda x: x["score"])
        return scored_candidates[:3]

    @staticmethod
    def get_nearest_hotspot(lat: float, lng: float) -> str:
        nearest = None
        min_dist = float('inf')
        
        for spot in TransportEngine.SEOUL_HOTSPOTS:
            dist = TransportEngine._haversine(lat, lng, spot['lat'], spot['lng'])
            if dist < min_dist:
                min_dist = dist
                nearest = spot
        
        if nearest and min_dist < 5000: return nearest['name']
        return "중간지점"