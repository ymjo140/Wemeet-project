import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

import models
from dependencies import get_db, verify_password, get_password_hash, create_access_token
from constants import KAKAO_REST_API_KEY

# 🌟 [중요] 카카오 개발자 센터에 등록된 URI와 100% 일치해야 함
KAKAO_REDIRECT_URI = "http://localhost:3000/auth/callback/kakao" 

router = APIRouter()

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class KakaoLoginRequest(BaseModel):
    code: str

@router.post("/api/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(400, "Email registered")
    db.add(models.User(
        email=user.email, 
        hashed_password=get_password_hash(user.password), 
        name=user.name, 
        avatar="👤", 
        preferences={}
    ))
    db.commit()
    return {"message": "User created"}

@router.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(400, "Incorrect info")
    return {
        "access_token": create_access_token({"sub": user.email}),
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name
    }

@router.post("/api/auth/kakao")
async def kakao_login(req: KakaoLoginRequest, db: Session = Depends(get_db)):
    # 1. 인가 코드로 토큰 요청
    token_url = "https://kauth.kakao.com/oauth/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "code": req.code
    }
    
    print(f"📢 [디버깅] 카카오 토큰 요청: {data}") # 로그 출력

    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, data=data)
        
        # 🌟 에러 발생 시 상세 로그 출력
        if token_res.status_code != 200:
            print(f"🔥 [에러] 카카오 토큰 발급 실패: {token_res.text}")
            raise HTTPException(400, "카카오 토큰 발급 실패")

        token_json = token_res.json()
        access_token = token_json.get("access_token")

        # 2. 사용자 정보 요청
        user_info_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_info_res.status_code != 200:
            print(f"🔥 [에러] 카카오 유저 정보 실패: {user_info_res.text}")
            raise HTTPException(400, "카카오 유저 정보 조회 실패")

        user_info = user_info_res.json()
        
        kakao_id = str(user_info.get("id"))
        kakao_properties = user_info.get("properties", {})
        nickname = kakao_properties.get("nickname", "KakaoUser")
        email = f"kakao_{kakao_id}@wemeet.com" 

        print(f"✅ [성공] 카카오 유저 확인: {nickname} ({email})")

        # 3. DB 확인 및 자동 가입
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print("🆕 신규 유저 가입 진행 중...")
            try:
                user = models.User(
                    email=email,
                    hashed_password=get_password_hash("kakao_social_login"),
                    name=nickname,
                    avatar="👤",
                    preferences={},
                    wallet_balance=3000
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                init_equip = {"body": "body_basic"}
                db.add(models.UserAvatar(user_id=user.id, equipped=init_equip, inventory=[]))
                db.commit()
                print("🎉 DB 저장 완료!")
            except Exception as e:
                print(f"🔥 [에러] DB 저장 실패: {e}")
                raise HTTPException(500, "회원가입 처리 중 DB 오류")

        # 4. 토큰 발급
        access_token = create_access_token({"sub": user.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "name": user.name
        }