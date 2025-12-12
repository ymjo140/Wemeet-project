import json
import math
import re
import random
import numpy as np
from uuid import UUID, uuid4
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
# 👇 [필수] Session과 text 임포트
from sqlalchemy.orm import Session
from sqlalchemy import text 
from database import engine, SessionLocal
import models
from routers import auth, users, meetings, community, sync, coins
from dependencies import get_password_hash
from analytics import DemandIntelligenceEngine

# DB 테이블 생성 (없으면 생성)
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        # 🌟 [긴급 패치] DB 구조 자동 업데이트 (Migration)
        # 배포 서버의 DB에 gender, age_group 컬럼이 없으면 강제로 추가합니다.
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR DEFAULT 'unknown'"))
            print("✅ DB 업데이트: gender 컬럼 추가됨")
        except Exception:
            db.rollback() # 이미 있으면 무시

        try:
            db.execute(text("ALTER TABLE users ADD COLUMN age_group VARCHAR DEFAULT '20s'"))
            print("✅ DB 업데이트: age_group 컬럼 추가됨")
        except Exception:
            db.rollback() # 이미 있으면 무시
        
        db.commit()

        # --- 기존 데이터 초기화 로직 ---
        if db.query(models.AvatarItem).count() == 0:
            print("🛍️ [초기화] 아바타 아이템 주입...")
            items = [
                models.AvatarItem(id="body_basic", category="body", name="기본 피부", price_coin=0, image_url="/assets/avatar/body_basic.png"),
                models.AvatarItem(id="eyes_normal", category="eyes", name="기본 눈", price_coin=0, image_url="/assets/avatar/eyes_normal.png"),
                models.AvatarItem(id="brows_basic", category="eyebrows", name="기본 눈썹", price_coin=0, image_url="/assets/avatar/brows_basic.png"),
                models.AvatarItem(id="hair_01", category="hair", name="댄디컷", price_coin=500, image_url="/assets/avatar/hair_01.png"),
                models.AvatarItem(id="hair_02", category="hair", name="단발", price_coin=500, image_url="/assets/avatar/hair_02.png"),
                models.AvatarItem(id="top_tshirt", category="top", name="노란 티셔츠", price_coin=0, image_url="/assets/avatar/top_tshirt.png"),
                models.AvatarItem(id="top_hoodie", category="top", name="초록 후드", price_coin=1000, image_url="/assets/avatar/top_hoodie.png"),
                models.AvatarItem(id="bottom_jeans", category="bottom", name="청바지", price_coin=500, image_url="/assets/avatar/bottom_jeans.png"),
                models.AvatarItem(id="bottom_shorts", category="bottom", name="초록 반바지", price_coin=0, image_url="/assets/avatar/bottom_shorts.png"),
                models.AvatarItem(id="shoes_sneakers", category="shoes", name="스니커즈", price_coin=0, image_url="/assets/avatar/shoes_sneakers.png"),
                models.AvatarItem(id="pet_dog", category="pet", name="강아지", price_coin=2000, image_url="/assets/avatar/pet_dog.png"),
                models.AvatarItem(id="foot_dust", category="footprint", name="먼지 효과", price_coin=1000, image_url="/assets/avatar/footprint_dust.png"),
            ]
            db.add_all(items)
            db.commit()

        if db.query(models.User).count() == 0:
            print("🚀 [초기화] 유저 생성...")
            pw_hash = get_password_hash("1234")
            users = [
                models.User(email="me@test.com", hashed_password=pw_hash, name="나", avatar="👤", wallet_balance=5000, lat=37.586, lng=127.029, gender="male", age_group="20s"),
                models.User(email="cleo@test.com", hashed_password=pw_hash, name="클레오", avatar="👦", wallet_balance=500, lat=37.557, lng=126.924, gender="female", age_group="20s"),
                models.User(email="benji@test.com", hashed_password=pw_hash, name="벤지", avatar="🧑", wallet_balance=500, lat=37.498, lng=127.027, gender="male", age_group="30s"),
                models.User(email="logan@test.com", hashed_password=pw_hash, name="로건", avatar="👧", wallet_balance=500, lat=37.544, lng=127.056, gender="female", age_group="20s"),
            ]
            db.add_all(users)
            db.commit()
            
            my_user = db.query(models.User).filter(models.User.email == "me@test.com").first()
            if my_user:
                init_equip = {
                    "body": "body_basic", "eyes": "eyes_normal", "eyebrows": "brows_basic",
                    "hair": "hair_01", "top": "top_tshirt", "bottom": "bottom_shorts",
                    "shoes": "shoes_sneakers", "pet": "pet_dog", "footprint": "foot_dust"
                }
                init_inven = ["body_basic", "eyes_normal", "brows_basic", "hair_01", "top_tshirt", "bottom_shorts", "shoes_sneakers", "pet_dog", "foot_dust"]
                db.add(models.UserAvatar(user_id=my_user.id, equipped=init_equip, inventory=init_inven))
                db.commit()

    finally:
        db.close()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 연결
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(meetings.router)
app.include_router(community.router)
app.include_router(sync.router)
app.include_router(coins.router)

@app.get("/")
def read_root():
    return {"status": "WeMeet API Running 🚀"}

# 🌟 [신규] B2B 데이터 판매용 API
@app.get("/api/b2b/demand-forecast")
def get_b2b_forecast(
    region: str = "강남", 
    days: int = 7, 
    db: Session = Depends(get_db)
):
    """
    🏢 B2B 고객용 미래 수요 예측 데이터 조회 (실제 DB 데이터 기반)
    """
    engine = DemandIntelligenceEngine(db)
    result = engine.get_future_demand(region, days)
    return result