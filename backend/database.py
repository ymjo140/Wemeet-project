from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite 파일 생성 (agora.db)
SQLALCHEMY_DATABASE_URL = "sqlite:///./agora.db"

# check_same_thread=False는 SQLite를 쓰레드 간 공유하기 위해 필요
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()