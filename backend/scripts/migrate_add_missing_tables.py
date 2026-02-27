"""数据库迁移脚本 - 添加缺失的表"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
current_file = Path(__file__).resolve()
project_root = current_file.parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import inspect
from backend.db.session import engine
from backend.db.base import Base

# 导入所有模型
from backend.models.user import User, UserSettings
from backend.models.dimension import (
    System,
    SystemLog,
    SystemAction,
    MealDeviation,
    SYSTEM_TYPES,
    DEFAULT_SYSTEM_DETAILS
)
from backend.models.diary import Diary, DiaryAttachment, DiaryEditHistory
from backend.models.insight import Insight
from backend.models.record import DailyRecord


def migrate():
    """添加缺失的表到现有数据库"""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    print(f"Existing tables: {existing_tables}")
    print("\nChecking for missing tables...")

    # 获取所有应该存在的表
    all_models = Base.metadata.tables.keys()
    missing_tables = [t for t in all_models if t not in existing_tables]

    if missing_tables:
        print(f"Found missing tables: {missing_tables}")
        print("\nCreating missing tables...")

        # 只创建缺失的表
        for table_name in missing_tables:
            table = Base.metadata.tables[table_name]
            table.create(bind=engine, checkfirst=True)
            print(f"[OK] Created table: {table_name}")

        print("\n[SUCCESS] Migration completed!")
    else:
        print("[OK] All tables exist, no migration needed")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
