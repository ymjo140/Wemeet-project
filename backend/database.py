from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 🌟 [핵심] 외부에서 import 할 수 있도록 변수 명시적 선언
DATABASE_URL = os.getenv("DATABASE_URL")

# 예외 처리
if not DATABASE_URL:
    print("⚠️ 경고: .env 파일에서 DATABASE_URL을 찾을 수 없습니다.")
    # 로컬 테스트용 기본값 (필요 시 수정)
    DATABASE_URL = "postgresql://user:password@localhost/dbname"

# Supabase 호환성 처리
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 엔진 생성
engine = create_engine(DATABASE_URL)

# 세션 생성기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스
Base = declarative_base()

# 의존성 주입용 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()