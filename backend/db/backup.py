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

from backend.core.config import settings


class DatabaseBackup:
    """数据库备份管理器"""

    def __init__(self, db_path: str, backup_dir: str = None, backup_type: str = "zips"):
        """
        初始化备份管理器

        Args:
            db_path: 数据库文件路径
            backup_dir: 备份目录，默认使用配置中的 BACKUP_DIR
            backup_type: 备份类型，可选 "zips" 或 "exports"，用于分类存储
        """
        self.db_path = Path(db_path)
        # 使用配置的 BACKUP_DIR 作为基础目录
        base_backup_dir = Path(backup_dir) if backup_dir else settings.BACKUP_DIR

        # 按类型和日期创建子目录: backups/zips/2026-03-08/
        today = datetime.now().strftime("%Y-%m-%d")
        self.backup_dir = base_backup_dir / backup_type / today
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # 保存备份类型信息，用于列表展示
        self.backup_type = backup_type

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
        import time

        backup_file = Path(backup_path)
        if not backup_file.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        # 验证备份文件
        if verify:
            if not self._verify_backup(backup_file):
                raise ValueError("Invalid backup file")

        # 创建当前数据库的备份（防止恢复失败）
        safety_backup = None
        if self.db_path.exists():
            safety_backup = self.create_backup("before_restore")

        temp_dir = None
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

            # Windows 文锁定需要重试机制
            files_to_delete = [
                self.db_path,
                Path(str(self.db_path) + "-wal"),
                Path(str(self.db_path) + "-shm")
            ]

            # 先删除现有数据库文件
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

            # 复制新数据库文件（带重试）
            for attempt in range(5):
                try:
                    shutil.copy2(restored_db, self.db_path)
                    break
                except PermissionError:
                    if attempt < 4:
                        time.sleep(0.5 * (attempt + 1))
                    else:
                        raise

            print(f"[OK] Database restored from: {backup_path}")
            return True

        except Exception as e:
            print(f"[ERROR] Restore failed: {e}")
            # 恢复失败时尝试使用安全备份（仅一次，避免递归）
            if safety_backup and self.db_path.exists():
                try:
                    # 直接复制安全备份，不再递归调用
                    self._close_all_connections()
                    for attempt in range(5):
                        try:
                            with zipfile.ZipFile(safety_backup, 'r') as zipf:
                                zipf.extractall(temp_dir or self.backup_dir / "temp")
                            restored = (temp_dir or self.backup_dir / "temp") / self.db_path.name
                            shutil.copy2(restored, self.db_path)
                            break
                        except PermissionError:
                            if attempt < 4:
                                time.sleep(0.5 * (attempt + 1))
                            else:
                                raise
                except Exception as restore_error:
                    print(f"[ERROR] Safety backup restore also failed: {restore_error}")
            raise

        finally:
            if temp_dir and temp_dir.exists():
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
            # 使用 DatabaseManager 关闭所有连接
            from backend.db.session import DatabaseManager
            DatabaseManager.close_all_connections()

            # 额外确保 engine 被释放
            from backend.db.session import engine
            engine.dispose()

            import time
            time.sleep(0.3)  # 给系统时间释放文件句柄

        except Exception as e:
            print(f"[WARN] Error closing connections: {e}")

    def list_backups(self, include_exports: bool = True) -> list:
        """列出所有备份"""
        backups = []
        base_backup_dir = settings.BACKUP_DIR

        # 需要检查的目录类型
        types_to_check = []
        if hasattr(self, 'backup_type'):
            # 如果指定了类型，只检查该类型
            types_to_check = [self.backup_type]
        else:
            types_to_check = ["zips", "exports"]

        for backup_type in types_to_check:
            # 检查所有日期子目录
            type_dir = base_backup_dir / backup_type
            if not type_dir.exists():
                continue

            # 遍历所有日期子目录
            for date_dir in type_dir.iterdir():
                if not date_dir.is_dir():
                    continue

                date_str = date_dir.name  # YYYY-MM-DD 格式

                for backup_file in date_dir.glob(f"*.{backup_type[:-1]}" if backup_type == "exports" else "*.zip"):
                    try:
                        # 对于 zips，读取元数据；对于 exports，直接获取信息
                        metadata = {}
                        if backup_type == "zips":
                            with zipfile.ZipFile(backup_file, 'r') as zipf:
                                metadata_json = zipf.read("metadata.json")
                                metadata = json.loads(metadata_json)

                        created_at = metadata.get("created_at", f"{date_str}T00:00:00")

                        backups.append({
                            "name": backup_file.stem,
                            "path": str(backup_file),
                            "type": backup_type,
                            "date": date_str,
                            "created_at": created_at,
                            "size": backup_file.stat().st_size
                        })

                    except Exception:
                        continue

        return sorted(backups, key=lambda x: x["created_at"], reverse=True)


def export_to_json(db_path: str, output_dir: str = None, use_classified_dir: bool = True) -> str:
    """
    导出数据库为 JSON 文件

    Args:
        db_path: 数据库路径
        output_dir: 输出目录，如果为 None 则使用分类目录
        use_classified_dir: 是否使用分类目录 (backups/exports/YYYY-MM-DD/)

    Returns:
        导出文件路径
    """
    from backend.db.session import SessionLocal
    from backend.models import User, UserSettings, System, Diary, Insight

    # 确定输出路径
    if output_dir and not use_classified_dir:
        output_path = Path(output_dir)
    else:
        # 使用分类目录: backups/exports/YYYY-MM-DD/
        base_dir = Path(output_dir) if output_dir else settings.BACKUP_DIR
        today = datetime.now().strftime("%Y-%m-%d")
        output_path = base_dir / "exports" / today

    output_path.mkdir(parents=True, exist_ok=True)

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
                "ai_config": user.ai_config,  # 导出 AI 配置
                "created_at": user.created_at.isoformat() if user.created_at else None
            })

        # 导出用户设置
        for setting in db.query(UserSettings).all():
            data["user_settings"].append({
                "id": setting.id,
                "user_id": setting.user_id,
                "theme": setting.theme,
                "language": setting.language,
                "auto_save_enabled": setting.auto_save_enabled,
                "auto_save_interval": setting.auto_save_interval,
                "notification_enabled": setting.notification_enabled,
                "notification_time": setting.notification_time,
                "show_year_progress": setting.show_year_progress,
                "show_weekday": setting.show_weekday,
                "pin_verify_on_startup": setting.pin_verify_on_startup,
                "pin_verify_for_private_journal": setting.pin_verify_for_private_journal,
                "pin_verify_for_data_export": setting.pin_verify_for_data_export,
                "pin_verify_for_settings_change": setting.pin_verify_for_settings_change,
                "created_at": setting.created_at.isoformat() if setting.created_at else None,
                "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
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

        # 导出日记
        for diary in db.query(Diary).all():
            data["diaries"].append({
                "id": diary.id,
                "user_id": diary.user_id,
                "content": diary.content,
                "title": diary.title,
                "mood": diary.mood,
                "tags": diary.tags,
                "related_system": diary.related_system,
                "is_private": diary.is_private,
                "created_at": diary.created_at.isoformat() if diary.created_at else None,
                "updated_at": diary.updated_at.isoformat() if diary.updated_at else None
            })

        # 导出洞察
        for insight in db.query(Insight).all():
            data["insights"].append({
                "id": insight.id,
                "user_id": insight.user_id,
                "content": insight.content,
                "system_scores": insight.system_scores,
                "provider_used": insight.provider_used,
                "generated_at": insight.generated_at.isoformat() if insight.generated_at else None
            })

        # 写入文件
        with open(export_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"[OK] Data exported to: {export_file}")
        return str(export_file)

    finally:
        db.close()


def import_from_json(db_path: str, data: dict) -> dict:
    """
    从 JSON 数据导入到数据库

    Args:
        db_path: 数据库路径
        data: JSON 格式的导入数据

    Returns:
        导入结果统计
    """
    from backend.db.session import SessionLocal
    from backend.models import User, UserSettings, System, Diary, Insight
    from datetime import datetime as dt

    # 验证数据格式
    if not isinstance(data, dict):
        raise ValueError("数据格式错误：必须是 JSON 对象")

    if "version" not in data:
        raise ValueError("数据格式错误：缺少 version 字段")

    db = SessionLocal()
    stats = {
        "users": 0,
        "user_settings": 0,
        "systems": 0,
        "diaries": 0,
        "insights": 0
    }

    try:
        # 导入用户
        if "users" in data:
            for user_data in data["users"]:
                existing = db.query(User).filter(User.id == user_data["id"]).first()
                if existing:
                    # 更新现有用户
                    existing.username = user_data.get("username")
                    existing.display_name = user_data.get("display_name")
                    if user_data.get("birthday"):
                        existing.birthday = dt.fromisoformat(user_data["birthday"])
                    existing.mbti = user_data.get("mbti")
                    existing.values = user_data.get("values")
                    existing.life_expectancy = user_data.get("life_expectancy")
                    existing.preferences = user_data.get("preferences")
                    if user_data.get("ai_config"):
                        existing.ai_config = user_data.get("ai_config")
                else:
                    # 创建新用户
                    user = User(
                        id=user_data["id"],
                        username=user_data.get("username"),
                        display_name=user_data.get("display_name"),
                        birthday=dt.fromisoformat(user_data["birthday"]) if user_data.get("birthday") else None,
                        mbti=user_data.get("mbti"),
                        values=user_data.get("values"),
                        life_expectancy=user_data.get("life_expectancy"),
                        preferences=user_data.get("preferences"),
                        ai_config=user_data.get("ai_config")
                    )
                    db.add(user)
                stats["users"] += 1

        # 导入系统
        if "systems" in data:
            for system_data in data["systems"]:
                existing = db.query(System).filter(System.id == system_data["id"]).first()
                if existing:
                    existing.user_id = system_data.get("user_id")
                    existing.type = system_data.get("type")
                    existing.score = system_data.get("score")
                    existing.details = system_data.get("details")
                else:
                    system = System(
                        id=system_data["id"],
                        user_id=system_data.get("user_id"),
                        type=system_data.get("type"),
                        score=system_data.get("score"),
                        details=system_data.get("details")
                    )
                    db.add(system)
                stats["systems"] += 1

        # 导入日记
        if "diaries" in data:
            for diary_data in data["diaries"]:
                existing = db.query(Diary).filter(Diary.id == diary_data["id"]).first()
                if existing:
                    existing.user_id = diary_data.get("user_id")
                    existing.title = diary_data.get("title")
                    existing.content = diary_data.get("content")
                    existing.mood = diary_data.get("mood")
                    existing.tags = diary_data.get("tags")
                    existing.related_system = diary_data.get("related_system")
                    existing.is_private = diary_data.get("is_private")
                    if diary_data.get("created_at"):
                        existing.created_at = dt.fromisoformat(diary_data["created_at"])
                    if diary_data.get("updated_at"):
                        existing.updated_at = dt.fromisoformat(diary_data["updated_at"])
                else:
                    diary = Diary(
                        id=diary_data["id"],
                        user_id=diary_data.get("user_id"),
                        title=diary_data.get("title"),
                        content=diary_data.get("content"),
                        mood=diary_data.get("mood"),
                        tags=diary_data.get("tags"),
                        related_system=diary_data.get("related_system"),
                        is_private=diary_data.get("is_private"),
                        created_at=dt.fromisoformat(diary_data["created_at"]) if diary_data.get("created_at") else None,
                        updated_at=dt.fromisoformat(diary_data["updated_at"]) if diary_data.get("updated_at") else None
                    )
                    db.add(diary)
                stats["diaries"] += 1

        # 导入洞察
        if "insights" in data:
            for insight_data in data["insights"]:
                existing = db.query(Insight).filter(Insight.id == insight_data["id"]).first()
                if existing:
                    existing.user_id = insight_data.get("user_id")
                    existing.content = insight_data.get("content")
                    existing.system_scores = insight_data.get("system_scores")
                    existing.provider_used = insight_data.get("provider_used")
                    if insight_data.get("generated_at"):
                        existing.generated_at = dt.fromisoformat(insight_data["generated_at"])
                else:
                    insight = Insight(
                        id=insight_data["id"],
                        user_id=insight_data.get("user_id"),
                        content=insight_data.get("content"),
                        system_scores=insight_data.get("system_scores"),
                        provider_used=insight_data.get("provider_used"),
                        generated_at=dt.fromisoformat(insight_data["generated_at"]) if insight_data.get("generated_at") else None
                    )
                    db.add(insight)
                stats["insights"] += 1

        db.commit()
        print(f"[OK] Data imported from JSON: {stats}")
        return stats

    except Exception as e:
        db.rollback()
        raise e

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
