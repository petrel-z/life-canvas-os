"""
数据库迁移脚本：添加PIN验证独立开关字段

运行方式：
python backend/scripts/migrate_add_pin_switches.py
"""
import sys
from pathlib import Path

# 添加项目根目录到路径
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import inspect, text
from backend.db.session import SessionLocal


def migrate():
    """执行数据库迁移"""
    db = SessionLocal()

    try:
        # 获取检查器
        inspector = inspect(db.bind)

        # 检查 user_settings 表是否存在
        if 'user_settings' not in inspector.get_table_names():
            print("[ERROR] user_settings table does not exist")
            return False

        # 获取现有列
        columns = [col['name'] for col in inspector.get_columns('user_settings')]
        print(f"[OK] Existing columns in user_settings: {len(columns)} columns")

        # 定义需要添加的新列
        new_columns = {
            'pin_verify_on_startup': 'INTEGER DEFAULT 1',
            'pin_verify_for_private_journal': 'INTEGER DEFAULT 1',
            'pin_verify_for_data_export': 'INTEGER DEFAULT 1',
            'pin_verify_for_settings_change': 'INTEGER DEFAULT 1'
        }

        # 找出需要添加的列
        columns_to_add = [col for col in new_columns.keys() if col not in columns]

        if not columns_to_add:
            print("[OK] All PIN switch columns already exist")
            return True

        print(f"[INFO] Adding {len(columns_to_add)} new columns: {columns_to_add}")

        # 添加新列
        with db.bind.connect() as conn:
            for column_name in columns_to_add:
                column_def = new_columns[column_name]
                sql = f"ALTER TABLE user_settings ADD COLUMN {column_name} {column_def}"
                print(f"  Executing: {sql}")
                conn.execute(text(sql))

            conn.commit()

        print("[OK] Database migration completed successfully!")
        print("\nNew columns:")
        print("  - pin_verify_on_startup: Verify PIN on startup")
        print("  - pin_verify_for_private_journal: Verify PIN for private journals")
        print("  - pin_verify_for_data_export: Verify PIN for data export")
        print("  - pin_verify_for_settings_change: Verify PIN for settings changes")
        print("  All columns default to 1 (enabled)")

        return True

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        db.rollback()
        return False

    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 50)
    print("PIN Verification Switches Migration")
    print("=" * 50)
    print()

    success = migrate()

    if success:
        print("\n[OK] Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n[ERROR] Migration failed, please check error messages")
        sys.exit(1)
