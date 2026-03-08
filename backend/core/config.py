import os
from pydantic_settings import BaseSettings
from pathlib import Path

# 获取 backend 目录的父级目录 (即项目根目录)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Life Canvas OS"
    API_V1_STR: str = "/api/v1"

    # 数据库配置
    # 优先使用 APP_DATA_DIR 环境变量（Electron 传入的 userData 目录）
    # 否则默认存储在项目根目录下（仅开发模式）
    DATA_DIR: Path = Path(os.getenv("APP_DATA_DIR", BASE_DIR))
    SQLITE_URL: str = f"sqlite:///{DATA_DIR}/life_canvas.db"

    # 如果将来想换 PostgreSQL，只需修改环境变量即可覆盖
    DATABASE_URL: str = os.getenv("DATABASE_URL", SQLITE_URL)

    # 备份目录配置
    BACKUP_DIR: Path = Path(os.getenv("BACKUP_DIR", BASE_DIR / "backups"))

    class Config:
        case_sensitive = True

settings = Settings()
