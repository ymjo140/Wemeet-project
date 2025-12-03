import numpy as np
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class POI:
    id: int
    name: str
    category: str
    tags: List[str]
    location: np.ndarray # [lat, lng]
    price_level: int     # 1(저렴) ~ 5(비쌈)
    avg_rating: float

@dataclass
class UserProfile:
    id: int
    preferences: Dict[str, Any]  # {foods, vibes, avg_spend, tag_weights}
    history: List[int]

class AdvancedRecommender:
    def __init__(self, users: List[UserProfile], candidates: List[POI]):
        self.users = users
        self.candidates = candidates

    # 🌟 [핵심] AI 학습 로직 (리뷰 기반 가중치 조정)
    @staticmethod
    def train_user_model(user_prefs: Dict, place_tags: List[str], rating: float, reason: str = None) -> Dict:
        """
        사용자의 리뷰를 바탕으로 취향 벡터를 업데이트합니다.
        rating: 1.0 ~ 5.0
        reason: "price", "taste", "service", "vibe" 등 부정적 요인
        """
        # 기존 가중치 로드 (없으면 초기화)
        weights = user_prefs.get("tag_weights", {})
        if not weights: weights = {}

        # 기준점(3.0) 대비 편차 (좋으면 +, 나쁘면 -)
        impact = (rating - 3.0) * 0.5 # 학습률 0.5
        
        for tag in place_tags:
            current = weights.get(tag, 0.0)
            # 점수 업데이트 (최대 10, 최소 -10 제한)
            weights[tag] = max(-10.0, min(10.0, current + impact))
        
        # 부정적 이유가 명확하면 해당 카테고리 태그 감점
        if reason and impact < 0:
            mapping = {"price": "가성비", "taste": "맛집", "service": "친절", "vibe": "분위기"}
            target = mapping.get(reason)
            if target:
                weights[target] = weights.get(target, 0.0) - 1.0

        user_prefs["tag_weights"] = weights
        return user_prefs

    def _calculate_group_vector(self) -> Dict[str, float]:
        """모임 멤버들의 취향을 종합하여 '그룹 페르소나'를 생성"""
        group_tags = {}
        
        for u in self.users:
            # 1. 명시적 선호 (가입 시 선택)
            for tag in u.preferences.get("foods", []) + u.preferences.get("vibes", []):
                group_tags[tag] = group_tags.get(tag, 0) + 1.0
            
            # 2. 🌟 암묵적 선호 (학습된 가중치 반영)
            learned_weights = u.preferences.get("tag_weights", {})
            for tag, weight in learned_weights.items():
                group_tags[tag] = group_tags.get(tag, 0) + weight

        return {"tags": group_tags, "price_level": 3} # 임시 가격

    def recommend(self, purpose: str, current_loc: np.ndarray, user_tags: List[str]) -> List[tuple]:
        group_profile = self._calculate_group_vector()
        scored_places = []

        # 목적별 가중치
        purpose_weights = {
            "비즈니스/접대": {"조용한": 2.0, "룸": 2.0, "주차": 1.5, "회의실": 3.0, "공유오피스": 3.0},
            "데이트/기념일": {"분위기": 2.0, "뷰": 1.5, "와인": 1.5, "파스타": 1.0},
            "술/회식": {"술": 2.0, "노포": 1.5, "단체석": 2.0},
            "식사": {"맛집": 1.5},
            "스터디/작업": {"콘센트": 2.0, "조용한": 1.5, "카공": 2.0, "스터디룸": 3.0}
        }.get(purpose, {})

        for place in self.candidates:
            score = 0.0
            
            # 1. [취향 적합도]
            for tag in place.tags:
                # 그룹 선호도 반영
                if tag in group_profile["tags"]:
                    score += group_profile["tags"][tag] * 0.5
                # 목적 적합도 반영
                if tag in purpose_weights:
                    score += purpose_weights[tag]
                # 이번 검색 태그 반영 (가장 중요)
                if tag in user_tags: 
                    score += 5.0
            
            # 2. [거리 가중치] (너무 멀면 감점)
            dist = np.linalg.norm(place.location - current_loc) * 100000 # 대략적 미터 환산
            if dist < 500: score += 2.0 # 500m 이내 보너스
            elif dist > 2000: score -= 3.0 # 2km 이상 감점
            
            # 3. [기본 평점]
            score += place.avg_rating * 0.5

            scored_places.append((place, score))

        # 점수 내림차순 정렬
        scored_places.sort(key=lambda x: x[1], reverse=True)
        return scored_places