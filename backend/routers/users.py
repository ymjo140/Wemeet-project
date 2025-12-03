from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from typing import List, Optional, Any
from pydantic import BaseModel

import models
import algorithm as agora_algo
from dependencies import get_db, get_current_user

router = APIRouter()

# --- Data Models ---
class UserPreferenceUpdate(BaseModel):
    foods: List[str] = []
    disliked_foods: List[str] = []
    vibes: List[str] = []
    alcohol: List[str] = []
    conditions: List[str] = []
    avg_spend: int = 15000

class EquipRequest(BaseModel):
    category: str
    item_id: str

class BuyRequest(BaseModel):
    item_id: str

class ReviewCreate(BaseModel):
    place_name: str
    rating: float      # 프론트에서 계산된 평균 별점 혹은 0 (백엔드에서 재계산 가능)
    score_taste: int   # 맛 (1~5)
    score_service: int # 서비스 (1~5)
    score_price: int   # 가격 (1~5)
    score_vibe: int    # 분위기 (1~5)
    tags: List[str] = []
    comment: Optional[str] = None
    reason: Optional[str] = None # 낮은 별점일 때의 주된 사유

class FavoriteRequest(BaseModel):
    place_id: int
    place_name: str

# --- User Info API ---
@router.get("/api/users/me")
def get_my_info(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. 아바타 정보 가져오기
    avatar = db.query(models.UserAvatar).filter(models.UserAvatar.user_id == current_user.id).first()
    avatar_data = {}
    if avatar:
        avatar_data = { "equipped": avatar.equipped, "inventory": avatar.inventory, "level": avatar.level }
    
    # 2. 내가 쓴 리뷰 목록 가져오기 (최신순)
    my_reviews = db.query(models.Review).filter(models.Review.user_id == current_user.id).order_by(models.Review.created_at.desc()).all()
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "preferences": current_user.preferences,
        "location": {"lat": current_user.lat, "lng": current_user.lng},
        "wallet_balance": current_user.wallet_balance,
        "avatar": avatar_data,
        "favorites": current_user.favorites,
        "reviews": my_reviews
    }

@router.put("/api/users/me/preferences")
def update_preferences(prefs: UserPreferenceUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.preferences = prefs.dict()
    flag_modified(current_user, "preferences")
    db.commit()
    return {"message": "Updated"}

# --- Shop & Avatar API ---
@router.get("/api/shop/items")
def get_shop_items(db: Session = Depends(get_db)):
    return db.query(models.AvatarItem).all()

@router.post("/api/shop/buy")
def buy_item(req: BuyRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.AvatarItem).filter(models.AvatarItem.id == req.item_id).first()
    if not item: raise HTTPException(404, "아이템 없음")
    
    avatar = db.query(models.UserAvatar).filter(models.UserAvatar.user_id == current_user.id).first()
    if not avatar:
        avatar = models.UserAvatar(user_id=current_user.id)
        db.add(avatar)
    
    inventory = avatar.inventory or []
    if req.item_id in inventory: return {"message": "이미 보유 중"}
    
    if current_user.wallet_balance < item.price_coin: raise HTTPException(400, "코인 부족")
    
    current_user.wallet_balance -= item.price_coin
    inventory.append(req.item_id)
    avatar.inventory = inventory
    flag_modified(avatar, "inventory")
    db.commit()
    return {"message": "구매 완료", "balance": current_user.wallet_balance}

@router.post("/api/avatar/equip")
def equip_item(req: EquipRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    avatar = db.query(models.UserAvatar).filter(models.UserAvatar.user_id == current_user.id).first()
    if not avatar: raise HTTPException(404, "아바타 정보 없음")
    
    equipped = dict(avatar.equipped) if avatar.equipped else {}
    equipped[req.category] = req.item_id 
    avatar.equipped = equipped
    flag_modified(avatar, "equipped")
    db.commit()
    return {"message": "장착 완료", "equipped": equipped}

# --- Review & Favorite API ---

@router.post("/api/reviews")
def create_review(review: ReviewCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. 종합 평점 계산 (4가지 항목의 평균)
    avg_rating = (review.score_taste + review.score_service + review.score_price + review.score_vibe) / 4.0
    
    # 2. 리뷰 저장
    db_review = models.Review(
        user_id=current_user.id,
        place_name=review.place_name,
        rating=avg_rating,
        score_taste=review.score_taste,
        score_service=review.score_service,
        score_price=review.score_price,
        score_vibe=review.score_vibe,
        comment=review.comment,
        tags=review.tags,
        reason=review.reason
    )
    db.add(db_review)
    
    # 3. 유저 성향 지표(평균 평점) 업데이트
    current_total_score = (current_user.avg_rating_given * current_user.review_count)
    current_user.review_count += 1
    current_user.avg_rating_given = (current_total_score + avg_rating) / current_user.review_count
    
    # 4. AI 학습 (algorithm.py 연동)
    current_prefs = dict(current_user.preferences) if current_user.preferences else {}
    
    # 낮은 점수일 경우 자동으로 가장 낮은 항목을 'reason'으로 추론하여 학습에 반영할 수도 있음
    scores = {'taste': review.score_taste, 'service': review.score_service, 'price': review.score_price, 'vibe': review.score_vibe}
    inferred_reason = min(scores, key=scores.get) if avg_rating <= 2.5 and not review.reason else review.reason
    
    updated_prefs = agora_algo.AdvancedRecommender.train_user_model(
        current_prefs, 
        review.tags, 
        avg_rating, 
        inferred_reason
    )
    current_user.preferences = updated_prefs
    flag_modified(current_user, "preferences")

    db.commit()
    return {"message": "Review saved & AI Model updated", "avg_rating": avg_rating}

@router.get("/api/reviews/{place_name}")
def get_place_reviews(place_name: str, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.place_name == place_name).order_by(models.Review.created_at.desc()).all()
    result = []
    for r in reviews:
        user = db.query(models.User).filter(models.User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "user_name": user.name if user else "알 수 없음",
            "rating": r.rating,
            "scores": { "taste": r.score_taste, "service": r.score_service, "price": r.score_price, "vibe": r.score_vibe },
            "comment": r.comment,
            "tags": r.tags,
            "created_at": r.created_at.strftime("%Y-%m-%d")
        })
    return result

@router.post("/api/favorites")
def toggle_favorite(req: FavoriteRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = list(current_user.favorites) if current_user.favorites else []
    target = {"id": req.place_id, "name": req.place_name}
    
    exists = False
    for f in favs:
        if isinstance(f, dict) and f.get("id") == req.place_id:
            favs.remove(f)
            exists = True
            break
            
    if not exists:
        favs.append(target)
        
    current_user.favorites = favs
    flag_modified(current_user, "favorites")
    db.commit()
    return {"message": "Removed" if exists else "Added", "favorites": favs}