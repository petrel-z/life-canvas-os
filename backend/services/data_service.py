"""
数据服务 - 数据管理业务逻辑（导出、导入、备份）
"""
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Tuple, Optional, Dict
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.db.backup import DatabaseBackup, export_to_json, import_from_json
from backend.db.session import DatabaseManager
from backend.schemas.common import error_response
from backend.core.config import settings


class DataService:
    """数据服务类"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取默认用户"""
        return db.query(User).first()

    @staticmethod
    def export_data_json(db: Session) -> Dict:
        """
        导出数据为 JSON 格式

        Returns:
            包含导出路径和元信息的字典
        """
        user = DataService.get_user(db)
        if not user:
            raise ValueError("用户不存在")

        # 使用分类目录导出
        export_path = export_to_json(
            db_path=db.bind.url.database,
            use_classified_dir=True
        )

        export_file = Path(export_path)
        created_at = datetime.now().isoformat()

        return {
            "export_path": export_path,
            "filename": export_file.name,
            "format": "json",
            "created_at": created_at,
            "size": export_file.stat().st_size
        }

    @staticmethod
    def export_data_zip(db: Session) -> Dict:
        """
        导出数据为 ZIP 备份格式

        Returns:
            包含导出路径和元信息的字典
        """
        user = DataService.get_user(db)
        if not user:
            raise ValueError("用户不存在")

        # 使用数据库备份格式，保存到分类目录
        backup_mgr = DatabaseBackup(db.bind.url.database, backup_type="zips")
        backup_path = backup_mgr.create_backup()

        backup_file = Path(backup_path)
        created_at = datetime.now().isoformat()

        return {
            "export_path": backup_path,
            "filename": backup_file.name,
            "format": "zip",
            "created_at": created_at,
            "size": backup_file.stat().st_size
        }

    @staticmethod
    def import_data(db: Session, backup_path: str = None, data: dict = None, verify: bool = True) -> Tuple[dict, int]:
        """
        导入数据

        支持两种导入方式：
        1. ZIP 备份文件：通过 backup_path 指定
        2. JSON 数据：通过 data 字段直接传入

        Returns:
            (response_data, status_code)
        """
        user = DataService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        # 检查参数：必须提供 backup_path 或 data 其中之一
        if not backup_path and not data:
            return error_response(message="必须提供 backup_path 或 data 参数", code=400), 400

        try:
            db_path = db.bind.url.database

            # JSON 数据导入
            if data:
                stats = import_from_json(db_path, data)
                return {
                    "import_type": "json",
                    "stats": stats,
                    "imported_at": datetime.now().isoformat()
                }, 200

            # ZIP 备份文件导入
            db.close()
            db.expunge_all()

            # 关闭所有数据库连接池
            DatabaseManager.close_all_connections()

            # 等待文件句柄释放
            import time
            time.sleep(0.5)

            # 使用 zips 类型进行恢复
            backup_mgr = DatabaseBackup(db_path, backup_type="zips")
            success = backup_mgr.restore_backup(backup_path, verify=verify)

            if success:
                return {
                    "import_type": "zip",
                    "backup_path": backup_path,
                    "imported_at": datetime.now().isoformat()
                }, 200
            else:
                return error_response(message="导入失败", code=500), 500

        except FileNotFoundError:
            return error_response(message="备份文件不存在", code=404), 404
        except ValueError as e:
            return error_response(message=str(e), code=400), 400
        except Exception as e:
            return error_response(message=f"导入失败: {str(e)}", code=500), 500

    @staticmethod
    def list_backups(db: Session) -> Tuple[dict, int]:
        """
        列出所有备份

        Returns:
            (response_data, status_code)
        """
        user = DataService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        try:
            # 创建备份管理器，列出所有类型的备份
            backup_mgr = DatabaseBackup(db.bind.url.database)
            backups = backup_mgr.list_backups(include_exports=True)

            return {
                "backups": backups,
                "total": len(backups)
            }, 200

        except Exception as e:
            return error_response(message=f"获取备份列表失败: {str(e)}", code=500), 500

    @staticmethod
    def create_backup(db: Session) -> Tuple[dict, int]:
        """
        创建数据库备份

        Returns:
            (response_data, status_code)
        """
        user = DataService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        try:
            # 使用分类目录
            backup_mgr = DatabaseBackup(db.bind.url.database, backup_type="zips")
            backup_path = backup_mgr.create_backup()

            backup_file = Path(backup_path)

            return {
                "backup_path": backup_path,
                "filename": backup_file.name,
                "created_at": datetime.now().isoformat(),
                "size": backup_file.stat().st_size
            }, 200

        except Exception as e:
            return error_response(message=f"备份创建失败: {str(e)}", code=500), 500

    @staticmethod
    def health_check() -> dict:
        """
        健康检查

        Returns:
            health_status dict
        """
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "connected": DatabaseManager.test_connection(),
                "pool_status": DatabaseManager.get_pool_status()
            }
        }

        return health_status

    @staticmethod
    def reset_system(db: Session) -> Tuple[dict, int]:
        """
        重置系统（删除所有数据并恢复到初始状态）

        流程：
        1. 创建当前数据库的备份
        2. 关闭当前会话和所有数据库连接
        3. 删除数据库文件
        4. 重新初始化数据库

        Returns:
            (response_data, status_code)
        """
        user = DataService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        try:
            db_path = db.bind.url.database

            # 1. 创建备份 (使用分类目录)
            backup_mgr = DatabaseBackup(db_path, backup_type="zips")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = backup_mgr.create_backup(f"before_reset_{timestamp}")

            # 2. 关闭当前会话
            db.close()
            db.expunge_all()

            # 3. 关闭所有数据库连接
            DatabaseManager.close_all_connections()

            # 4. 删除数据库文件（包括 -wal 和 -shm 文件）
            import time
            db_file = Path(db_path)
            wal_file = Path(str(db_file) + "-wal")
            shm_file = Path(str(db_file) + "-shm")

            # Windows 文件锁定需要重试机制
            files_to_delete = [db_file, wal_file, shm_file]
            for file_path in files_to_delete:
                if file_path.exists():
                    for attempt in range(5):
                        try:
                            os.remove(file_path)
                            break
                        except PermissionError:
                            if attempt < 4:
                                time.sleep(0.5 * (attempt + 1))
                            else:
                                raise

            # 5. 重新初始化数据库
            from backend.db.init_db import init_db
            from backend.db.session import SessionLocal

            # 创建新的数据库会话进行初始化
            new_db = SessionLocal()
            try:
                init_db(new_db)
            finally:
                new_db.close()

            return {
                "backup_path": backup_path,
                "reset_at": datetime.now().isoformat()
            }, 200

        except Exception as e:
            return error_response(message=f"系统重置失败: {str(e)}", code=500), 500
