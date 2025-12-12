import time
import sys
import requests
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from transport import TransportEngine

# 테이블이 없으면 생성
models.Base.metadata.create_all(bind=engine)

# 🌟 하루 안전 제한 설정 (ODsay 무료가 1000회라면 5000회에서 컷)
DAILY_LIMIT = 40000 

def build_time_matrix():
    db = SessionLocal()
    hotspots = TransportEngine.SEOUL_HOTSPOTS
    
    print(f"🚀 총 {len(hotspots)}개 거점에 대한 매트릭스 작업을 시작합니다.")
    print(f"⚠️ 일일 제한: {DAILY_LIMIT}회 설정됨")
    
    api_calls_count = 0
    skipped_count = 0
    
    # N x N 루프
    for i, start in enumerate(hotspots):
        for j, end in enumerate(hotspots):
            if start['name'] == end['name']: continue
            
            # 1. DB 캐시 확인 (이미 있으면 건너뛰기)
            cache_id = f"{start['name']}_{end['name']}"
            
            # 쿼리 최적화를 위해 ID만 조회
            exists = db.query(models.TravelTimeCache.id).filter_by(id=cache_id).first()
            
            if exists: 
                skipped_count += 1
                # 진행 상황 시각화 (너무 많이 찍히면 정신사나우니까 1000개마다)
                if skipped_count % 1000 == 0:
                    print(f"⏭️ {skipped_count}개 경로 건너뜀 (이미 완료됨)...")
                continue

            # 2. 일일 제한 체크
            if api_calls_count >= DAILY_LIMIT:
                print(f"\n🛑 [일일 제한 도달] {api_calls_count}회 호출 완료. 오늘은 여기까지!")
                print(f"👉 남은 작업은 내일 다시 실행해주세요.")
                db.close()
                sys.exit(0) # 프로그램 안전 종료

            try:
                # 3. API 호출
                print(f"📡 [{api_calls_count+1}/{DAILY_LIMIT}] API 호출: {start['name']} -> {end['name']}")
                
                time_cost = TransportEngine.get_transit_time(
                    start['lat'], start['lng'], end['lat'], end['lng']
                )
                
                # 호출 횟수 증가 (성공하든 실패하든 호출은 한 것임)
                api_calls_count += 1
                
                if time_cost:
                    cache = models.TravelTimeCache(
                        id=cache_id,
                        start_name=start['name'],
                        end_name=end['name'],
                        total_time=time_cost
                    )
                    db.add(cache)
                    db.commit() # 바로바로 저장 (중간에 꺼져도 안전하게)
                    print(f"   ✅ 저장 완료: {time_cost}분")
                else:
                    print("   ⚠️ 경로 없음 또는 에러")

                # API 과부하 방지 (0.1초 휴식)
                time.sleep(0.1)

            except Exception as e:
                print(f"❌ 치명적 오류: {e}")
                time.sleep(1) # 에러나면 좀 더 쉬기

    db.close()
    print("\n🎉 모든 가능한 경로의 매트릭스 구축이 완료되었습니다! (대단해요!)")

if __name__ == "__main__":
    build_time_matrix()