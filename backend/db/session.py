"""数据库会话管理（增强版）"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Generator
import logging

from backend.core.config import settings

logger = logging.getLogger(__name__)


# 针对 SQLite 的特殊参数
connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}

# 创建引擎，配置连接池
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    poolclass=QueuePool,
    pool_size=5,  # 连接池大小
    max_overflow=10,  # 最大溢出连接数
    pool_timeout=30,  # 获取连接的超时时间（秒）
    pool_recycle=1800,  # 连接回收时间（秒）- 30分钟
    pool_pre_ping=True,  # 连接前检查可用性
    echo=False,  # 生产环境关闭 SQL 日志
    future=True  # 使用 SQLAlchemy 2.0 风格
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # 避免提交后对象过期
)


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    获取数据库会话的上下文管理器

    用法:
        with get_db_context() as db:
            # 使用 db
            pass
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        db.close()


def get_db():
    """
    依赖注入函数：用于在 API 中获取数据库会话

    用法:
        @router.get("/")
        async def endpoint(db: Session = Depends(get_db)):
            # 使用 db
            pass
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DatabaseManager:
    """数据库管理器"""

    @staticmethod
    def test_connection() -> bool:
        """测试数据库连接"""
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False

    @staticmethod
    def get_pool_status() -> dict:
        """获取连接池状态"""
        pool = engine.pool
        status = {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
        }

        # SQLite 的连接池不支持 overflow
        if hasattr(pool, "max_overflow"):
            status["max_overflow"] = pool.max_overflow()
            status["overflow"] = pool.overflow()

        return status

    @staticmethod
    def close_all_connections():
        """关闭所有数据库连接"""
        try:
            engine.dispose()
            logger.info("All database connections closed")
        except Exception as e:
            logger.error(f"Error closing connections: {e}")

    @staticmethod
    @contextmanager
    def transaction(db: Session):
        """
        事务管理器

        用法:
            with DatabaseManager.transaction(db):
                # 执行多个数据库操作
                pass
        """
        try:
            yield
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Transaction failed: {e}")
            raise
