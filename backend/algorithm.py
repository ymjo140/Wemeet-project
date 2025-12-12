import numpy as np
from typing import List, Dict, Any
from dataclasses import dataclass
from sqlalchemy.orm import Session
from models import MeetingHistory
import json

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
class GroupClusterEngine:
    def __init__(self, db: Session):
        self.db = db

    def _calculate_similarity(self, target_tags: list, history_tags: list, target_count: int, history_count: int):
        """
        유사도 점수 계산 (0.0 ~ 1.0)
        1. 태그 유사도 (자카드): 공통 태그 / 전체 태그
        2. 인원 유사도: 인원수가 비슷할수록 높은 점수
        """
        # 1. 태그 유사도 (가중치 70%)
        set_a = set(target_tags)
        set_b = set(history_tags)
        if not set_a or not set_b:
            tag_score = 0
        else:
            intersection = len(set_a & set_b)
            union = len(set_a | set_b)
            tag_score = intersection / union

        # 2. 인원 유사도 (가중치 30%) -> 인원 차이가 적을수록 1에 가까움
        size_diff = abs(target_count - history_count)
        size_score = 1 / (1 + size_diff * 0.5) 

        return (tag_score * 0.7) + (size_score * 0.3)

    def recommend_by_similar_groups(self, purpose: str, current_tags: list, participant_count: int, region_name: str):
        """
        현재 모임과 가장 유사한 과거 모임들이 선택한 장소 Top 5 반환
        """
        # 1. 같은 목적, 같은 지역의 기록만 1차 필터링
        candidates = self.db.query(MeetingHistory).filter(
            MeetingHistory.purpose == purpose,
            MeetingHistory.region_name.contains(region_name) # "강남" 포함
        ).all()

        if not candidates:
            return []

        scored_places = []

        # 2. 유사도 계산
        for history in candidates:
            try:
                # DB에 저장된 태그가 문자열이라면 리스트로 변환
                h_tags = history.tags.split(",") if history.tags else []
                
                similarity = self._calculate_similarity(
                    current_tags, h_tags, participant_count, history.participant_count
                )

                # 유사도가 0.3 이상인(어느정도 비슷한) 경우만 반영
                if similarity > 0.3:
                    # 점수 = 유사도 * 만족도(가중치)
                    final_score = similarity * history.satisfaction_score
                    scored_places.append({
                        "name": history.selected_place_name,
                        "score": final_score,
                        "reason": f"유사한 '{history.tags}' 성향 그룹이 선택함"
                    })
            except: continue

        # 3. 점수순 정렬
        scored_places.sort(key=lambda x: x["score"], reverse=True)
        
        # 중복 제거 (상위권만 남김)
        seen = set()
        unique_places = []
        for p in scored_places:
            if p["name"] not in seen:
                seen.add(p["name"])
                unique_places.append(p)

        return unique_places[:5]