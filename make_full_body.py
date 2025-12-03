# make_full_body.py
import os
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("pip install Pillow 명령어로 라이브러리를 먼저 설치해주세요!")
    sys.exit(1)

SAVE_DIR = "./public/assets/avatar"
if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

# 이미지 크기 (전신이라 세로로 김)
WIDTH, HEIGHT = 300, 600

def create_image(filename):
    return Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))

def draw_body(filename):
    img = create_image(filename)
    draw = ImageDraw.Draw(img)
    # 피부색 (살구색)
    skin_color = "#FAD7BD"
    
    # 1. 다리
    draw.rectangle((110, 350, 140, 550), fill=skin_color) # 왼쪽 다리
    draw.rectangle((160, 350, 190, 550), fill=skin_color) # 오른쪽 다리
    
    # 2. 몸통
    draw.rectangle((100, 200, 200, 360), fill=skin_color)
    
    # 3. 팔
    draw.rectangle((70, 210, 100, 400), fill=skin_color) # 왼팔
    draw.rectangle((200, 210, 230, 400), fill=skin_color) # 오른팔
    
    # 4. 얼굴
    draw.ellipse((90, 80, 210, 200), fill=skin_color)
    
    # 5. 속옷 (기본 매너)
    draw.rectangle((100, 330, 200, 360), fill="white") 
    
    img.save(os.path.join(SAVE_DIR, filename))
    print(f"✅ 바디 생성: {filename}")

def draw_hair(filename, color, style):
    img = create_image(filename)
    draw = ImageDraw.Draw(img)
    
    if style == "short": # 댄디컷
        draw.chord((80, 70, 220, 180), 180, 360, fill=color)
        draw.rectangle((85, 120, 100, 160), fill=color) # 구렛나루
        draw.rectangle((200, 120, 215, 160), fill=color)
    elif style == "long": # 포니테일
        draw.chord((80, 70, 220, 180), 160, 380, fill=color)
        # 뒷머리
        draw.rectangle((210, 100, 250, 250), fill=color) 
        
    img.save(os.path.join(SAVE_DIR, filename))
    print(f"✅ 헤어 생성: {filename}")

def draw_outfit(filename, color, type):
    img = create_image(filename)
    draw = ImageDraw.Draw(img)
    
    if type == "basic": # 티셔츠 + 반바지
        # 상의
        draw.rectangle((95, 200, 205, 320), fill=color)
        draw.rectangle((65, 200, 100, 280), fill=color) # 소매
        draw.rectangle((200, 200, 235, 280), fill=color)
        # 하의 (청바지 느낌)
        draw.rectangle((105, 310, 195, 420), fill="#3b82f6")
        
    elif type == "run": # 러닝복 (나시 + 레깅스)
        # 상의
        draw.rectangle((105, 210, 195, 330), fill=color)
        # 하의 (검정 레깅스)
        draw.rectangle((110, 330, 140, 500), fill="#111111") 
        draw.rectangle((160, 330, 190, 500), fill="#111111")

    img.save(os.path.join(SAVE_DIR, filename))
    print(f"✅ 의상 생성: {filename}")

def draw_pet(filename, color):
    img = create_image(filename)
    draw = ImageDraw.Draw(img)
    # 발 옆에 위치
    draw.ellipse((200, 450, 280, 530), fill=color) # 몸통
    draw.polygon([(210,460), (230,430), (250,460)], fill=color) # 귀
    img.save(os.path.join(SAVE_DIR, filename))
    print(f"✅ 펫 생성: {filename}")

def draw_footprint(filename, color):
    img = create_image(filename)
    draw = ImageDraw.Draw(img)
    # 발 밑 그림자/이펙트
    draw.ellipse((80, 540, 220, 570), fill=color)
    img.save(os.path.join(SAVE_DIR, filename))
    print(f"✅ 발자국 생성: {filename}")

# --- 실행 ---
draw_body("base_body.png")

draw_hair("hair_01.png", "#333333", "short") # 흑발
draw_hair("hair_02.png", "#8B4513", "long")  # 갈색머리

draw_outfit("outfit_basic.png", "#DDDDDD", "basic") # 흰티
draw_outfit("outfit_run.png", "#FF5722", "run")     # 주황 러닝복

draw_pet("pet_dog.png", "#D2691E") # 강아지
draw_pet("pet_cat.png", "#FFD700") # 고양이

draw_footprint("foot_fire.png", "#FF4500") # 불꽃
draw_footprint("foot_flower.png", "#FF69B4") # 벚꽃