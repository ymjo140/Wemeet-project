from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models
from collections import defaultdict

class DemandIntelligenceEngine:
    def __init__(self, db: Session):
        self.db = db

    def get_future_demand(self, region_name: str, days: int = 7):
        """
        B2B용 초정밀 수요 예측 (Segmentation 포함)
        """
        today = datetime.now().date()
        end_date = today + timedelta(days=days)
        
        # 1. 확정된 약속 조회
        events = self.db.query(models.Event).filter(
            models.Event.date >= str(today),
            models.Event.date <= str(end_date),
            models.Event.location_name.like(f"%{region_name}%")
        ).all()

        # 2. 세분화 집계 컨테이너
        daily_trend = []
        
        # 전체 통계용
        total_visitors = 0
        total_revenue = 0
        
        # 세그먼트별 집계
        segment_stats = {
            "by_age": defaultdict(int),      # 연령별 (20s: 50명)
            "by_gender": defaultdict(int),   # 성별 (female: 30명)
            "by_purpose": defaultdict(int),  # 목적별 (dating: 10팀)
            "by_time": defaultdict(int)      # 시간대별 (18:00: 100명)
        }

        # 3. 데이터 분석 루프
        # 날짜별로 그룹화
        events_by_date = defaultdict(list)
        for event in events:
            events_by_date[event.date].append(event)

        # 날짜 순 정렬하여 처리
        sorted_dates = sorted(events_by_date.keys())
        
        for date_str in sorted_dates:
            day_events = events_by_date[date_str]
            day_visitor_count = 0
            day_revenue = 0
            
            for event in day_events:
                # 주최자 정보 조회 (데모그래픽 분석용)
                host = self.db.query(models.User).filter(models.User.id == event.user_id).first()
                
                # 인원수 (DB에 없으면 기본 2~4명 추정)
                headcount = 4 if "회식" in event.purpose else 2
                
                # 예상 객단가 (목적 기반 추정)
                avg_spend = self._get_avg_spend(event.purpose)
                spending = avg_spend * headcount

                # [통계 누적]
                day_visitor_count += headcount
                day_revenue += spending
                
                # 1) 목적 세분화
                segment_stats["by_purpose"][event.purpose] += headcount
                
                # 2) 시간대 세분화 (18:00 -> "저녁")
                time_slot = self._get_time_slot(event.time)
                segment_stats["by_time"][time_slot] += headcount
                
                # 3) 데모그래픽 (주최자 기준 추정 + 동반인)
                if host:
                    age = host.age_group or "20s"
                    gender = host.gender or "unknown"
                    segment_stats["by_age"][age] += headcount
                    segment_stats["by_gender"][gender] += headcount
            
            daily_trend.append({
                "date": date_str,
                "visitor_count": day_visitor_count,
                "estimated_revenue": day_revenue
            })
            
            total_visitors += day_visitor_count
            total_revenue += day_revenue

        return {
            "region": region_name,
            "period": f"{today} ~ {end_date}",
            "summary": {
                "total_visitors": total_visitors,
                "total_market_size": total_revenue,
            },
            "segmentation": {
                "age_distribution": dict(segment_stats["by_age"]),
                "gender_distribution": dict(segment_stats["by_gender"]),
                "purpose_distribution": dict(segment_stats["by_purpose"]),
                "peak_times": dict(segment_stats["by_time"])
            },
            "daily_trend": daily_trend,
            "ai_insight": self._generate_detailed_insight(region_name, segment_stats)
        }

    def _get_avg_spend(self, purpose):
        # 목적별 평균 객단가 데이터 (AI 학습 또는 통계 기반)
        return {
            "식사": 18000, "술/회식": 45000, "데이트": 60000, 
            "카페": 12000, "스터디": 5000
        }.get(purpose, 20000)

    def _get_time_slot(self, time_str):
        try:
            hour = int(time_str.split(":")[0])
            if 11 <= hour <= 14: return "점심 (11-14)"
            if 14 < hour <= 17: return "오후 (14-17)"
            if 17 < hour <= 21: return "저녁 (17-21)"
            if 21 < hour <= 24: return "심야 (21-24)"
            return "기타"
        except: return "기타"

    def _generate_detailed_insight(self, region, stats):
        # 가장 비중이 높은 목적 찾기
        top_purpose = max(stats["by_purpose"], key=stats["by_purpose"].get, default="모임")
        top_age = max(stats["by_age"], key=stats["by_age"].get, default="20대")
        
        return f"💡 [AI 전략 제안] '{region}' 상권은 다음 주 '{top_age}' 고객의 '{top_purpose}' 수요가 지배적입니다. 특히 '{top_purpose}' 관련 재고를 30% 더 확보하고, 해당 연령층을 타겟으로 한 프로모션을 준비하세요."