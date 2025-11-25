import numpy as np
from enum import Enum
from dataclasses import dataclass
from typing import List, Dict


# 1. 기본 정의 -------------------------------------------------------------

class MeetingPurpose(Enum):
    BUSINESS = "business"
    DRINKING = "drinking"
    STUDY = "study"
    DATE = "date"
    MEAL = "meal"
    CAFE = "cafe"


@dataclass
class POI:
    id: int
    name: str
    category: str          # restaurant / cafe / bar / izakaya / workspace / culture ...
    tags: List[str]
    price_level: int       # 1~5 (대략적인 가격대)
    location: np.ndarray   # [lat, lng]
    avg_rating: float      # 1.0~5.0


@dataclass
class User:
    id: int
    name: str
    history_poi_ids: List[int]


# --- [가상 DB] 내 즐겨찾기 분석용 POI 속성 -------------------------------

MOCK_POI_DB: Dict[int, Dict] = {
    101: {"cat": "cafe",        "price": 2, "tags": ["조용한", "콘센트", "감성"]},
    102: {"cat": "restaurant",  "price": 1, "tags": ["가성비", "혼밥", "한식"]},
    103: {"cat": "izakaya",     "price": 4, "tags": ["술", "시끄러운", "회식"]},
    104: {"cat": "fine_dining", "price": 5, "tags": ["조용한", "코스", "접대", "룸"]},
    105: {"cat": "bar",         "price": 5, "tags": ["와인", "분위기", "데이트"]},
}


# 2. 동적 상황 프로파일러 (유저 취향 벡터) ---------------------------------

class ContextProfiler:
    def __init__(self):
        self.context_weights = {
            MeetingPurpose.BUSINESS: {
                "tags": ["조용한", "룸", "접대", "회의", "호텔"],
                "min_price": 3,
            },
            MeetingPurpose.DATE: {
                "tags": ["분위기", "뷰", "와인", "파스타"],
                "min_price": 3,
            },
            MeetingPurpose.STUDY: {
                "tags": ["조용한", "콘센트", "스터디"],
                "min_price": 1,
            },
            MeetingPurpose.DRINKING: {
                "tags": ["술", "회식", "포차"],
                "min_price": 1,
            },
            MeetingPurpose.MEAL: {
                "tags": ["맛집", "한식", "양식"],
                "min_price": 1,
            },
            MeetingPurpose.CAFE: {
                "tags": ["카페", "디저트"],
                "min_price": 1,
            },
        }

    def derive_preference_vector(self, user: User, purpose: MeetingPurpose) -> np.ndarray:
        """
        [가격 민감도, 평점 선호, 분위기 선호, 프라이빗 선호, 술 선호] 5차원 벡터 생성
        """
        target_tags = self.context_weights.get(purpose, {}).get("tags", [])
        vector = np.array([0.5, 0.5, 0.5, 0.5, 0.5])  # 중립값

        valid_count = 0
        for pid in user.history_poi_ids:
            poi = MOCK_POI_DB.get(pid)
            if not poi:
                continue

            if any(t in poi["tags"] for t in target_tags) or purpose == MeetingPurpose.MEAL:
                valid_count += 1

                # 가격
                if poi["price"] >= 4:
                    vector[0] -= 0.15
                elif poi["price"] <= 2:
                    vector[0] += 0.15

                # 분위기 / 프라이빗 / 술
                if "분위기" in poi["tags"]:
                    vector[2] += 0.2
                if "룸" in poi["tags"] or "콘센트" in poi["tags"]:
                    vector[3] += 0.2
                if "술" in poi["tags"]:
                    vector[4] += 0.3

        if valid_count == 0:
            # 이력 없으면 목적별 기본값
            if purpose == MeetingPurpose.BUSINESS:
                vector = np.array([0.1, 0.9, 0.8, 0.9, 0.3])
            elif purpose == MeetingPurpose.DATE:
                vector = np.array([0.3, 0.7, 0.9, 0.6, 0.5])
            elif purpose == MeetingPurpose.STUDY:
                vector = np.array([0.8, 0.3, 0.2, 0.95, 0.0])
            else:
                vector = np.array([0.5, 0.5, 0.5, 0.5, 0.5])

        return np.clip(vector, 0.1, 0.9)


# 3. 목적 관리자 (필터링 + 보너스) -----------------------------------------

class PurposeManager:
    def __init__(self):
        # 카테고리 화이트리스트
        self.whitelists = {
            MeetingPurpose.BUSINESS: [
                "workspace", "fine_dining", "hotel", "cafe", "restaurant", "korean", "japanese"
            ],
            MeetingPurpose.DATE: [
                "place", "fine_dining", "izakaya", "bar", "cafe", "restaurant", "culture", "park"
            ],
            MeetingPurpose.DRINKING: [
                "izakaya", "bar", "pub", "restaurant", "bbq", "pocha"
            ],
            MeetingPurpose.STUDY: [
                "cafe", "workspace", "library", "bakery_cafe"
            ],
            MeetingPurpose.MEAL: [
                "restaurant", "korean", "chinese", "japanese", "western", "snack", "bbq"
            ],
            MeetingPurpose.CAFE: [
                "cafe", "bakery_cafe", "dessert"
            ],
        }

        # 목적별 기본 필터 태그 (필터를 하나도 안 골랐을 때 사용)
        self.default_filter_tags: Dict[MeetingPurpose, List[str]] = {
            MeetingPurpose.MEAL: [
                "맛집", "식당", "레스토랑", "밥집",
                "한식", "중식", "양식", "일식", "스시", "초밥",
                "돈까스", "파스타", "스테이크", "중화요리", "중국집",
                "고기집", "삼겹살", "한우", "갈비", "숯불", "구이",
                "족발", "보쌈", "분식", "국밥", "찌개",
                "버거", "피자", "멕시칸", "이탈리안",
                "조용한", "캐주얼", "인스타", "감성", "뷰맛집", "야경", "테라스",
            ],
            MeetingPurpose.DRINKING: [
                "술집", "이자카야", "와인바", "칵테일바", "호프", "포차", "포장마차",
                "펍", "주점", "하이볼", "맥주", "소주", "위스키", "안주", "회식", "단체",
            ],
            MeetingPurpose.CAFE: [
                "카페", "브런치", "디저트", "베이커리", "케이크",
                "스페셜티", "로스터리", "커피", "티룸",
                "조용한", "감성", "인스타", "노트북",
            ],
            MeetingPurpose.STUDY: [
                "스터디카페", "스터디 룸", "스터디룸",
                "공부", "조용한", "콘센트", "노트북", "와이파이",
                "독서실", "예약제",
            ],
            MeetingPurpose.BUSINESS: [
                "회의실", "미팅룸", "미팅 룸", "세미나실", "컨퍼런스룸", "컨퍼런스 룸",
                "공유오피스", "코워킹", "코워킹스페이스",
                "호텔 라운지", "라운지바",
                "비즈니스미팅", "투자미팅", "IR",
                "프레젠테이션", "프로젝터", "화이트보드", "주차",
            ],
            MeetingPurpose.DATE: [
                "데이트", "기념일", "프로포즈",
                "분위기 좋은", "감성", "인스타",
                "뷰맛집", "야경", "루프탑", "테라스",
                "와인", "칵테일", "바",
                "파인다이닝", "코스요리", "코스 요리",
                "조용한",
            ],
        }

    def _get_effective_tags(self, purpose: MeetingPurpose, user_tags: List[str]) -> List[str]:
        # 사용자가 태그를 고르면 그것만, 아니면 목적별 기본 태그 전체
        if user_tags:
            return [t.lower() for t in user_tags]
        base = self.default_filter_tags.get(purpose, [])
        return [t.lower() for t in base]

    def filter_candidates(self, all_pois: List[POI], purpose: MeetingPurpose,
                          user_tags: List[str]) -> List[POI]:
        allowed = self.whitelists.get(purpose, [])
        filtered: List[POI] = []
        effective_tags = self._get_effective_tags(purpose, user_tags)

        for p in all_pois:
            # 1차: 카테고리 필터
            if allowed and p.category not in allowed:
                continue

            poi_meta = (p.name + " " + p.category + " " + " ".join(p.tags)).lower()

            # 2차: 태그 필터 (합집합 OR 매칭)
            if effective_tags:
                if not any(t in poi_meta for t in effective_tags):
                    continue

            # 3차: 기본 휴리스틱 (필터를 안 골랐을 때만)
            if not user_tags:
                if purpose == MeetingPurpose.BUSINESS and "시끄러운" in p.tags:
                    continue
                if purpose == MeetingPurpose.DATE and p.price_level == 1:
                    continue

            filtered.append(p)

        # 너무 적으면 그냥 전체 반환 (빈 화면 방지)
        if len(filtered) < 3:
            return all_pois
        return filtered

    def calculate_purpose_bonus(self, poi: POI, purpose: MeetingPurpose,
                                user_tags: List[str]) -> float:
        bonus = 1.0
        effective_tags = self._get_effective_tags(purpose, user_tags)

        if effective_tags:
            poi_meta = (poi.name + " " + poi.category + " " + " ".join(poi.tags)).lower()
            match_count = sum(1 for t in effective_tags if t in poi_meta)
            bonus += match_count * 0.3

        if purpose == MeetingPurpose.BUSINESS and poi.category == "workspace":
            bonus += 0.5
        if purpose == MeetingPurpose.DATE and "분위기" in poi.tags:
            bonus += 0.3

        return min(bonus, 2.5)


# 4. 메인 엔진 --------------------------------------------------------------

class AgoraRecommender:
    def __init__(self, all_users: List[User], all_pois: List[POI]):
        self.manager = PurposeManager()
        self.profiler = ContextProfiler()
        self.all_pois = all_pois
        self.all_users = all_users

    def recommend(
        self,
        group_users: List[User],
        purpose_str: str,
        current_loc: np.ndarray,
        user_tags: List[str],
    ):
        try:
            purpose = MeetingPurpose(purpose_str)
        except Exception:
            purpose = MeetingPurpose.MEAL

        # 1) 후보군 필터링
        candidates = self.manager.filter_candidates(self.all_pois, purpose, user_tags)

        # 2) 모임 전체 취향 벡터
        group_vectors = [
            self.profiler.derive_preference_vector(u, purpose)
            for u in group_users
        ]
        group_avg_vec = np.mean(group_vectors, axis=0)

        # 3) POI별 점수
        final_results = []
        for poi in candidates:
            poi_vec = np.array(
                [
                    1.0 - (poi.price_level / 5.0),                # 가격
                    0.8 if poi.avg_rating > 4.0 else 0.5,        # 평점
                    0.9 if "분위기" in poi.tags else 0.4,         # 분위기
                    0.9 if ("룸" in poi.tags or "콘센트" in poi.tags) else 0.4,
                    0.9 if "술" in poi.tags else 0.1,            # 술
                ]
            )
            match_score = float(np.dot(group_avg_vec, poi_vec))

            purpose_bonus = self.manager.calculate_purpose_bonus(
                poi, purpose, user_tags
            )

            dist = float(np.linalg.norm(poi.location - current_loc))
            dist_penalty = np.log1p(dist * 5.0)

            final_score = (match_score * purpose_bonus) / (dist_penalty + 0.1)
            final_results.append((poi, final_score))

        return sorted(final_results, key=lambda x: x[1], reverse=True)[:10]
