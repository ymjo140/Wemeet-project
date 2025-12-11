# backend/build_cache.py

import time
import requests
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from transport import TransportEngine

# 테이블 생성
models.Base.metadata.create_all(bind=engine)

def build_time_matrix():
    db = SessionLocal()
    hotspots = TransportEngine.SEOUL_HOTSPOTS
    
    print(f"🚀 총 {len(hotspots)}개 거점에 대한 매트릭스 생성을 시작합니다.")
    count = 0
    
    # N x N 루프 (시간이 좀 걸립니다)
    for start in hotspots:
        for end in hotspots:
            if start['name'] == end['name']: continue
            
            # 이미 DB에 있는지 확인
            cache_id = f"{start['name']}_{end['name']}"
            existing = db.query(models.TravelTimeCache).filter_by(id=cache_id).first()
            if existing: continue

            try:
                # ODsay API 호출
                time_cost = TransportEngine.get_transit_time(
                    start['lat'], start['lng'], end['lat'], end['lng']
                )
                
                if time_cost:
                    cache = models.TravelTimeCache(
                        id=cache_id,
                        start_name=start['name'],
                        end_name=end['name'],
                        total_time=time_cost
                    )
                    db.add(cache)
                    count += 1
                    print(f"✅ [{count}] {start['name']} -> {end['name']}: {time_cost}분")
                
                # API 제한 방지 (0.1초 대기)
                time.sleep(0.1)
                
                # 50개마다 커밋
                if count % 50 == 0: db.commit()

            except Exception as e:
                print(f"❌ Error: {e}")

    db.commit()
    print("🎉 매트릭스 구축 완료!")

if __name__ == "__main__":
    build_time_matrix()