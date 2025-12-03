# slice_pixel_art.py
import os
from PIL import Image

# 설정
SOURCE_FILE = "global.png"  # 원본 파일명
OUTPUT_DIR = "./public/assets/avatar/raw" # 자른 파일이 저장될 곳
GRID_SIZE = 32 # 픽셀 단위 (Cozy Pack은 32x32)

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def slice_sheet():
    if not os.path.exists(SOURCE_FILE):
        print(f"❌ '{SOURCE_FILE}' 파일이 없습니다. 프로젝트 폴더에 넣어주세요.")
        return

    img = Image.open(SOURCE_FILE).convert("RGBA")
    width, height = img.size
    
    cols = width // GRID_SIZE
    rows = height // GRID_SIZE
    
    print(f"🧩 이미지 크기: {width}x{height} -> {cols}x{rows} 그리드로 자릅니다.")

    count = 0
    for r in range(rows):
        for c in range(cols):
            left = c * GRID_SIZE
            top = r * GRID_SIZE
            right = left + GRID_SIZE
            bottom = top + GRID_SIZE
            
            # 자르기
            crop = img.crop((left, top, right, bottom))
            
            # 빈 이미지(투명)는 저장 안 함
            if crop.getbbox():
                # 4배 확대 (32px은 너무 작아서 128px로 키움 - 깨짐 방지)
                crop = crop.resize((128, 128), Image.NEAREST)
                
                filename = f"tile_{r}_{c}.png"
                crop.save(os.path.join(OUTPUT_DIR, filename))
                count += 1

    print(f"✅ 총 {count}개의 파츠 생성 완료!")
    print(f"📂 '{OUTPUT_DIR}' 폴더에서 마음에 드는 파일을 골라 이름을 바꿔주세요.")

if __name__ == "__main__":
    slice_sheet()