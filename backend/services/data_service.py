"""
数据服务 - 数据管理业务逻辑（导出、导入、备份）
"""
import os
import tempfile
from datetime import datetime
from typing import Tuple, Optional
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.db.backup import DatabaseBackup, export_to_json
from backend.db.session import DatabaseManager
from backend.schemas.common import error_response


class DataService:
    """数据服务类"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取默认用户"""
        return db.query(User).first()

    @staticmethod
    def export_data_json(db: Session) -> Tuple[str, str, str]:
        """
        导出数据为 JSON 格式

        Returns:
            (export_path, filename, media_type)
        """
        user = DataService.get_user(db)
        if not user:
            raise ValueError("用户不存在")

        # 使用 JSON 格式导出
        export_dir = tempfile.mkdtemp()
        export_path = export_to_json(
            db_path=db.bind.url.database,
            output_dir=export_dir
        )

        filename = f"life_canvas_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        return export_path, filename, "application/json"

    @staticmethod
    def export_data_zip(db: Session) -> Tuple[str, str, str]:
        """
        导出数据为 ZIP 备份格式

        Returns:
            (backup_path, filename, media_type)
        """
        user = DataService.get_user(db)
        if not user:
            raise ValueError("用户不存在")

        # 使用数据库备份格式
        backup_mgr = DatabaseBackup(db.bind.url.database)
        backup_path = backup_mgr.create_backup()

        filename = os.path.basename(backup_path)

        return backup_path, filename, "application/zip"

    @staticmethod
    def import_data(db: Session, backup_path: str, verify: bool = True) -> Tuple[dict, int]:
        """
        导入数据

        Returns:
            (response_data, status_code)
        """
        user = DataService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        try:
            backup_mgr = DatabaseBackup(db.bind.url.database)
            success = backup_mgr.restore_backup(backup_path, verify=verify)

            if success:
                return {
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
            backup_mgr = DatabaseBackup(db.bind.url.database)
            backups = backup_mgr.list_backups()

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
            backup_mgr = DatabaseBackup(db.bind.url.database)
            backup_path = backup_mgr.create_backup()

            return {
                "backup_path": backup_path,
                "created_at": datetime.now().isoformat()
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
