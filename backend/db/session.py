"""数据库会话管理（增强版）"""
import logging
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Generator

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


# 为 SQLite 配置本地时间（而非 UTC）
@event.listens_for(engine, "connect")
def set_sqlite_local_time(dbapi_conn, connection_record):
    """配置 SQLite 使用本地时间"""
    if "sqlite" in settings.DATABASE_URL:
        from datetime import datetime

        # 创建本地时间函数（返回 ISO 格式字符串）
        def local_now():
            """返回当前本地时间（ISO 格式字符串）"""
            return datetime.now().isoformat()

        # 注册到 SQLite
        dbapi_conn.create_function("localnow", 0, local_now)

        # 优化 SQLite 性能
        cursor = dbapi_conn.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
        except Exception:
            pass
        cursor.close()


# 创建本地时间函数（用于模型中的 server_default）
from sqlalchemy import func

# 定义一个使用本地时间的函数（仅适用于 SQLite）
if "sqlite" in settings.DATABASE_URL:
    # SQLite 使用自定义函数
    localnow_func = func.localnow
else:
    # 其他数据库使用本地时间的函数
    localnow_func = func.now

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

    _original_url = settings.DATABASE_URL
    _engine = engine
    _session_factory = SessionLocal

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
    def verify_tables() -> bool:
        """
        验证数据库表是否存在

        Returns:
            True if all required tables exist, False otherwise
        """
        required_tables = ['users', 'systems', 'diaries']
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                existing_tables = [row[0] for row in result]
                logger.info(f"Existing tables: {existing_tables}")

                missing = [t for t in required_tables if t not in existing_tables]
                if missing:
                    logger.error(f"Missing required tables: {missing}")
                    return False
                return True
        except Exception as e:
            logger.error(f"Failed to verify tables: {e}")
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
    def recreate_engine():
        """
        重新创建数据库引擎

        在 ZIP 备份恢复后调用，用于指向新的数据库文件
        """
        global engine, SessionLocal

        try:
            # 记录当前引擎状态
            logger.info(f"Current engine URL: {engine.url}")
            logger.info(f"Current database path: {engine.url.database}")

            # 关闭旧引擎的所有连接
            engine.dispose()
            logger.info("Disposed old engine connections")

            # 重新创建引擎
            connect_args = {"check_same_thread": False} if "sqlite" in DatabaseManager._original_url else {}
            logger.info(f"Creating new engine with URL: {DatabaseManager._original_url}")

            engine = create_engine(
                DatabaseManager._original_url,
                connect_args=connect_args,
                poolclass=QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800,
                pool_pre_ping=True,
                echo=False,
                future=True
            )

            logger.info(f"New engine created with database path: {engine.url.database}")

            # 重新配置 SQLite 本地时间事件监听
            @event.listens_for(engine, "connect")
            def set_sqlite_local_time(dbapi_conn, connection_record):
                if "sqlite" in DatabaseManager._original_url:
                    from datetime import datetime

                    def local_now():
                        return datetime.now().isoformat()

                    dbapi_conn.create_function("localnow", 0, local_now)

                    cursor = dbapi_conn.cursor()
                    try:
                        cursor.execute("PRAGMA journal_mode=WAL")
                    except Exception:
                        pass
                    cursor.close()

            # 重新创建 SessionLocal
            SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=engine,
                expire_on_commit=False
            )

            # 更新模块级变量
            import sys
            current_module = sys.modules[__name__]
            current_module.engine = engine
            current_module.SessionLocal = SessionLocal

            # 测试新引擎
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                logger.info("Database engine recreated and verified successfully")
            except Exception as e:
                logger.error(f"Engine recreated but connection test failed: {e}")
                raise

        except Exception as e:
            logger.error(f"Error recreating engine: {e}")
            raise

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
