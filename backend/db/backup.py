"""数据库备份和恢复工具"""
import os
import shutil
import json
from datetime import datetime
from pathlib import Path
from typing import Optional
import zipfile
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session


class DatabaseBackup:
    """数据库备份管理器"""

    def __init__(self, db_path: str, backup_dir: str = None):
        """
        初始化备份管理器

        Args:
            db_path: 数据库文件路径
            backup_dir: 备份目录，默认在数据库目录下的 backups 文件夹
        """
        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir) if backup_dir else self.db_path.parent / "backups"
        self.backup_dir.mkdir(exist_ok=True)

        # 保留最近 7 天的备份
        self.retention_days = 7

    def create_backup(self, name: Optional[str] = None) -> str:
        """
        创建数据库备份

        Args:
            name: 备份名称，默认使用时间戳

        Returns:
            备份文件路径
        """
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database file not found: {self.db_path}")

        # 生成备份文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = name or f"backup_{timestamp}"
        backup_path = self.backup_dir / f"{backup_name}.zip"

        # 创建临时目录
        temp_dir = self.backup_dir / "temp"
        temp_dir.mkdir(exist_ok=True)

        try:
            # 复制数据库文件
            temp_db = temp_dir / self.db_path.name
            shutil.copy2(self.db_path, temp_db)

            # 创建备份元数据
            metadata = {
                "backup_name": backup_name,
                "created_at": datetime.now().isoformat(),
                "db_size": temp_db.stat().st_size,
                "db_file": self.db_path.name
            }

            metadata_file = temp_dir / "metadata.json"
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            # 创建 ZIP 压缩包
            with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(temp_db, self.db_path.name)
                zipf.write(metadata_file, "metadata.json")

            print(f"[OK] Backup created: {backup_path}")
            return str(backup_path)

        finally:
            # 清理临时文件
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

        # 清理旧备份
        self._cleanup_old_backups()

    def restore_backup(self, backup_path: str, verify: bool = True) -> bool:
        """
        从备份恢复数据库

        Args:
            backup_path: 备份文件路径
            verify: 是否验证备份文件

        Returns:
            是否恢复成功
        """
        backup_file = Path(backup_path)
        if not backup_file.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        # 验证备份文件
        if verify:
            if not self._verify_backup(backup_file):
                raise ValueError("Invalid backup file")

        # 创建当前数据库的备份（防止恢复失败）
        if self.db_path.exists():
            safety_backup = self.create_backup("before_restore")

        try:
            temp_dir = self.backup_dir / "temp"
            temp_dir.mkdir(exist_ok=True)

            # 解压备份文件
            with zipfile.ZipFile(backup_file, 'r') as zipf:
                zipf.extractall(temp_dir)

            # 恢复数据库文件
            restored_db = temp_dir / self.db_path.name
            if not restored_db.exists():
                raise FileNotFoundError("Database file not found in backup")

            # 关闭所有数据库连接
            self._close_all_connections()

            # 恢复文件
            shutil.copy2(restored_db, self.db_path)

            print(f"[OK] Database restored from: {backup_path}")
            return True

        except Exception as e:
            print(f"[ERROR] Restore failed: {e}")
            # 恢复失败时使用安全备份
            if self.db_path.exists():
                self.restore_backup(safety_backup, verify=False)
            raise

        finally:
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

    def _verify_backup(self, backup_path: Path) -> bool:
        """验证备份文件"""
        try:
            with zipfile.ZipFile(backup_path, 'r') as zipf:
                # 检查必需文件
                files = zipf.namelist()
                if self.db_path.name not in files:
                    return False
                if "metadata.json" not in files:
                    return False

                # 验证元数据
                metadata_json = zipf.read("metadata.json")
                metadata = json.loads(metadata_json)
                if "backup_name" not in metadata:
                    return False

                return True

        except Exception as e:
            print(f"[ERROR] Backup verification failed: {e}")
            return False

    def _cleanup_old_backups(self):
        """清理超过保留期的备份"""
        cutoff_time = datetime.now().timestamp() - (self.retention_days * 86400)

        for backup_file in self.backup_dir.glob("*.zip"):
            if backup_file.stat().st_mtime < cutoff_time:
                backup_file.unlink()
                print(f"[INFO] Deleted old backup: {backup_file.name}")

    def _close_all_connections(self):
        """关闭所有数据库连接（SQLite 特有）"""
        try:
            # SQLite 需要通过特定方式关闭连接
            from backend.db.session import engine
            engine.dispose()
        except Exception:
            pass

    def list_backups(self) -> list:
        """列出所有备份"""
        backups = []

        for backup_file in self.backup_dir.glob("*.zip"):
            try:
                with zipfile.ZipFile(backup_file, 'r') as zipf:
                    # 读取元数据
                    metadata_json = zipf.read("metadata.json")
                    metadata = json.loads(metadata_json)

                    backups.append({
                        "name": backup_file.stem,
                        "path": str(backup_file),
                        "created_at": metadata.get("created_at"),
                        "size": backup_file.stat().st_size
                    })

            except Exception:
                continue

        return sorted(backups, key=lambda x: x["created_at"], reverse=True)


def export_to_json(db_path: str, output_dir: str) -> str:
    """
    导出数据库为 JSON 文件

    Args:
        db_path: 数据库路径
        output_dir: 输出目录

    Returns:
        导出文件路径
    """
    from backend.db.session import SessionLocal
    from backend.models import User, UserSettings, System, Diary, Insight

    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_file = output_path / f"export_{timestamp}.json"

    db = SessionLocal()
    try:
        data = {
            "exported_at": datetime.now().isoformat(),
            "version": "1.0.0",
            "users": [],
            "user_settings": [],
            "systems": [],
            "diaries": [],
            "insights": []
        }

        # 导出用户
        for user in db.query(User).all():
            data["users"].append({
                "id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "birthday": user.birthday.isoformat() if user.birthday else None,
                "mbti": user.mbti,
                "values": user.values,
                "life_expectancy": user.life_expectancy,
                "preferences": user.preferences,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })

        # 导出系统
        for system in db.query(System).all():
            data["systems"].append({
                "id": system.id,
                "user_id": system.user_id,
                "type": system.type,
                "score": system.score,
                "details": system.details,
                "created_at": system.created_at.isoformat() if system.created_at else None
            })

        # 写入文件
        with open(export_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"[OK] Data exported to: {export_file}")
        return str(export_file)

    finally:
        db.close()


if __name__ == "__main__":
    # 测试备份功能
    db_path = "d:/pythonCode/life-canvas-os/life_canvas.db"
    backup_mgr = DatabaseBackup(db_path)

    print("Creating backup...")
    backup_path = backup_mgr.create_backup()
    print(f"Backup created: {backup_path}")

    print("\nListing backups:")
    backups = backup_mgr.list_backups()
    for backup in backups:
        print(f"  - {backup['name']} ({backup['created_at']})")
