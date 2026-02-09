"""数据库初始化脚本（增强版）"""
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from backend.db.base import Base
from backend.db.session import engine, SessionLocal

# 导入所有模型确保它们被 SQLAlchemy 注册
from backend.models.user import User, UserSettings
from backend.models.dimension import System, SystemLog, SystemAction, SYSTEM_TYPES, DEFAULT_SYSTEM_DETAILS
from backend.models.diary import Diary, DiaryAttachment, DiaryEditHistory
from backend.models.insight import Insight
from backend.models.record import DailyRecord


def ensure_database_initialized(db: Session) -> bool:
    """
    确保数据库已初始化（如果未初始化则自动初始化）

    Returns:
        是否进行了初始化操作
    """
    # 检查表是否存在
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # 如果没有任何表，需要初始化
    if len(existing_tables) == 0:
        print("[INFO] No database tables found. Initializing database...")
        init_db(db)
        return True

    # 检查关键表是否存在
    required_tables = ['users', 'systems']
    missing_tables = [t for t in required_tables if t not in existing_tables]

    if missing_tables:
        print(f"[INFO] Missing tables: {missing_tables}. Re-initializing...")
        init_db(db)
        return True

    # 检查是否有默认用户
    user = db.query(User).first()
    if not user:
        print("[INFO] No default user found. Creating...")
        _create_default_user(db)
        return True

    return False


def init_db(db: Session) -> None:
    """初始化数据库（完整版）"""
    # 1. 创建所有表
    print("[INFO] Creating database tables...")
    Base.metadata.create_all(bind=engine)

    # 2. 初始化默认用户
    _create_default_user(db)

    # 3. 初始化用户设置
    _create_default_settings(db)

    # 4. 初始化 8 个系统
    _create_default_systems(db)

    print("\n[SUCCESS] Database initialization completed!")


def _create_default_user(db: Session) -> User:
    """创建默认用户"""
    user = db.query(User).first()
    if not user:
        user = User(
            username="Owner",
            display_name="用户",
            preferences={"theme": "dark"}
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[OK] Created default user: {user.username}")
    return user


def _create_default_settings(db: Session) -> None:
    """创建默认用户设置"""
    user = db.query(User).first()
    if not user:
        return

    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        print(f"[OK] Created default user settings")


def _create_default_systems(db: Session) -> None:
    """创建默认的 8 个系统"""
    user = db.query(User).first()
    if not user:
        return

    existing_systems = db.query(System).filter(System.user_id == user.id).count()
    if existing_systems == 0:
        for system_type in SYSTEM_TYPES:
            system = System(
                user_id=user.id,
                type=system_type,
                score=50,
                details=DEFAULT_SYSTEM_DETAILS.get(system_type, {})
            )
            db.add(system)
        db.commit()
        print(f"[OK] Initialized 8 life balance systems: {', '.join(SYSTEM_TYPES)}")


def is_database_empty() -> bool:
    """检查数据库是否为空（无数据）"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return len(tables) == 0


if __name__ == "__main__":
    print("Starting database initialization...")
    db = SessionLocal()
    try:
        init_db(db)
    except Exception as e:
        print(f"Initialization failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()
