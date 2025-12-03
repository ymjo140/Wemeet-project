# make_2d_assets.py
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow 라이브러리가 필요합니다. 'pip install Pillow'를 실행해주세요.")
    sys.exit(1)

SAVE_DIR = "./public/assets/avatar"
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

# 2D 캐릭터 크기 (150x300 - 비율 1:2)
W, H = 150, 300

def new_img():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def draw_rect(draw, x, y, w, h, color):
    draw.rectangle((x, y, x+w, y+h), fill=color)

def create_assets():
    print("🎨 2D 아바타 에셋 생성 중...")

    # 1. Body (기본 몸통 - 졸라맨 스타일 말고 살집 있게)
    img = new_img(); d = ImageDraw.Draw(img)
    skin = "#FFE0BD"
    # 얼굴
    d.ellipse((35, 20, 115, 100), fill=skin)
    # 몸통
    draw_rect(d, 45, 100, 60, 100, skin)
    # 팔
    draw_rect(d, 25, 100, 20, 90, skin)
    draw_rect(d, 105, 100, 20, 90, skin)
    # 다리
    draw_rect(d, 45, 200, 25, 90, skin)
    draw_rect(d, 80, 200, 25, 90, skin)
    # 기본 속옷 (흰색)
    draw_rect(d, 45, 180, 60, 20, "white")
    img.save(f"{SAVE_DIR}/body_basic.png")

    # 2. Eyes (눈)
    img = new_img(); d = ImageDraw.Draw(img)
    # 동그란 눈
    d.ellipse((55, 50, 65, 60), fill="black")
    d.ellipse((85, 50, 95, 60), fill="black")
    img.save(f"{SAVE_DIR}/eyes_normal.png")

    # 3. Brows (눈썹)
    img = new_img(); d = ImageDraw.Draw(img)
    draw_rect(d, 53, 40, 15, 3, "#554433")
    draw_rect(d, 83, 40, 15, 3, "#554433")
    img.save(f"{SAVE_DIR}/brows_basic.png")

    # 4. Hair (머리)
    # 댄디컷 (검정)
    img = new_img(); d = ImageDraw.Draw(img)
    d.chord((30, 15, 120, 90), 180, 360, fill="#333333")
    draw_rect(d, 30, 50, 10, 30, "#333333")
    draw_rect(d, 110, 50, 10, 30, "#333333")
    img.save(f"{SAVE_DIR}/hair_01.png")
    
    # 단발 (갈색)
    img = new_img(); d = ImageDraw.Draw(img)
    d.chord((30, 15, 120, 100), 150, 390, fill="#8B4513")
    draw_rect(d, 30, 50, 15, 60, "#8B4513")
    draw_rect(d, 105, 50, 15, 60, "#8B4513")
    img.save(f"{SAVE_DIR}/hair_02.png")

    # 5. Top (상의)
    # 노란색 티셔츠 (레퍼런스 참고)
    img = new_img(); d = ImageDraw.Draw(img)
    draw_rect(d, 43, 100, 64, 85, "#FCD34D") # 몸통
    draw_rect(d, 23, 100, 20, 40, "#FCD34D") # 소매
    draw_rect(d, 107, 100, 20, 40, "#FCD34D")
    img.save(f"{SAVE_DIR}/top_tshirt.png")
    
    # 초록색 후드
    img = new_img(); d = ImageDraw.Draw(img)
    draw_rect(d, 40, 100, 70, 90, "#4ADE80")
    draw_rect(d, 20, 100, 25, 80, "#4ADE80") # 긴팔
    draw_rect(d, 105, 100, 25, 80, "#4ADE80")
    img.save(f"{SAVE_DIR}/top_hoodie.png")

    # 6. Bottom (하의)
    # 초록색 반바지 (레퍼런스 참고)
    img = new_img(); d = ImageDraw.Draw(img)
    draw_rect(d, 43, 185, 64, 45, "#15803D")
    draw_rect(d, 73, 200, 4, 30, "#14532d") # 가랑이 구분선
    img.save(f"{SAVE_DIR}/bottom_shorts.png")
    
    # 청바지
    img = new_img(); d = ImageDraw.Draw(img)
    draw_rect(d, 43, 185, 64, 105, "#3B82F6")
    draw_rect(d, 73, 200, 4, 90, "#1E40AF")
    img.save(f"{SAVE_DIR}/bottom_jeans.png")

    # 7. Shoes (신발)
    img = new_img(); d = ImageDraw.Draw(img)
    draw_rect(d, 40, 280, 35, 15, "#333333")
    draw_rect(d, 75, 280, 35, 15, "#333333")
    img.save(f"{SAVE_DIR}/shoes_sneakers.png")

    # 8. Extra (펫, 발자국)
    # 강아지
    img = new_img(); d = ImageDraw.Draw(img)
    d.ellipse((100, 220, 140, 260), fill="#D97706")
    d.polygon([(105,225), (115,210), (125,225)], fill="#D97706")
    d.ellipse((110, 235, 115, 240), fill="black")
    d.ellipse((125, 235, 130, 240), fill="black")
    img.save(f"{SAVE_DIR}/pet_dog.png")

    # 발자국 (이펙트용 - 반투명 흰색/회색)
    img = new_img(); d = ImageDraw.Draw(img)
    d.ellipse((20, 280, 50, 295), fill=(200, 200, 200, 150))
    d.ellipse((100, 280, 130, 295), fill=(200, 200, 200, 150))
    img.save(f"{SAVE_DIR}/footprint_dust.png")

    print("✅ 2D 아바타 파일 생성 완료!")

if __name__ == "__main__":
    create_assets()