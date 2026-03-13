"""数据库备份和恢复工具"""
import os
import shutil
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import zipfile
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.core.config import settings

logger = logging.getLogger(__name__)


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

        # 先关闭所有数据库连接，确保数据一致性
        try:
            from backend.db.session import DatabaseManager
            DatabaseManager.close_all_connections()
            import time
            time.sleep(0.3)
        except Exception as e:
            logger.warning(f"Error closing connections before backup: {e}")

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

            # 同时复制 WAL 文件（如果存在）
            wal_file = Path(str(self.db_path) + "-wal")
            if wal_file.exists():
                shutil.copy2(wal_file, temp_dir / wal_file.name)

            # 检查复制后的数据库文件是否有内容
            if temp_db.stat().st_size < 1000:
                raise ValueError(f"Database file is too small to be valid: {temp_db.stat().st_size} bytes")

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
                raise ValueError("Invalid backup file: verification failed (missing required files or tables)")

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

            # 找到恢复的数据库文件（大小写不敏感匹配）
            files_in_temp = list(temp_dir.iterdir())
            restored_db = None
            for f in files_in_temp:
                if f.is_file() and f.name.lower() == self.db_path.name.lower():
                    restored_db = f
                    break

            if not restored_db:
                logger.error(f"Database file not found after extraction: {self.db_path.name}")
                raise FileNotFoundError("Database file not found in backup") 

            # 关闭所有数据库连接
            self._close_all_connections()

            # 强制垃圾回收以释放文件句柄
            import gc
            gc.collect()

            # 额外等待确保文件句柄释放
            time.sleep(1.0)

            # Windows 文件锁定需要更长的重试机制
            files_to_delete = [
                self.db_path,
                Path(str(self.db_path) + "-wal"),
                Path(str(self.db_path) + "-shm")
            ]

            # 先删除现有数据库文件
            for file_path in files_to_delete:
                if file_path.exists():
                    for attempt in range(10):
                        try:
                            os.remove(file_path)
                            break
                        except PermissionError:
                            if attempt < 9:
                                time.sleep(1.0 * (attempt + 1))
                            else:
                                raise

            # 复制新数据库文件（带重试）
            for attempt in range(10):
                try:
                    shutil.copy2(restored_db, self.db_path)
                    break
                except PermissionError:
                    if attempt < 9:
                        time.sleep(1.0 * (attempt + 1))
                    else:
                        raise

            print(f"[OK] Database restored from: {backup_path}")

            # 验证恢复后的数据库
            if not self._verify_restored_database():
                logger.error("Database verification failed - tables missing or database invalid")
                raise ValueError("恢复的数据库无效：缺少必需的表")

            logger.info("Database verification passed")
            return True

        except Exception as e:
            print(f"[ERROR] Restore failed: {e}")
            # 恢复失败时尝试使用安全备份（仅一次，避免递归）
            if safety_backup and self.db_path.exists():
                try:
                    # 直接复制安全备份，不再递归调用
                    self._close_all_connections()

                    # 确保 temp_dir 存在
                    temp_restore_dir = temp_dir or self.backup_dir / "temp"
                    temp_restore_dir.mkdir(parents=True, exist_ok=True)

                    for attempt in range(10):
                        try:
                            with zipfile.ZipFile(safety_backup, 'r') as zipf:
                                zipf.extractall(temp_restore_dir)

                            # 找到正确的数据库文件（大小写不敏感匹配）
                            restored = None
                            for f in temp_restore_dir.iterdir():
                                if f.is_file() and f.name.lower() == self.db_path.name.lower():
                                    restored = f
                                    break

                            if not restored:
                                raise FileNotFoundError(f"Safety backup database file not found: {self.db_path.name}")

                            shutil.copy2(restored, self.db_path)
                            break
                        except PermissionError:
                            if attempt < 9:
                                time.sleep(1.0 * (attempt + 1))
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
            import time
            temp_dir = self.backup_dir / "verify_temp"
            temp_dir.mkdir(exist_ok=True)

            try:
                with zipfile.ZipFile(backup_path, 'r') as zipf:
                    # 检查必需文件
                    files = zipf.namelist()
                    logger.info(f"Backup file contents: {files}")

                    # 找到大小写不敏感匹配的文件名
                    db_filename = None
                    for f in files:
                        if f.lower() == self.db_path.name.lower():
                            db_filename = f
                            break

                    if not db_filename:
                        logger.error(f"Database file {self.db_path.name} not found in backup (case-insensitive search)")
                        return False

                    if "metadata.json" not in files:
                        logger.error("metadata.json not found in backup")
                        return False

                    # 验证元数据
                    metadata_json = zipf.read("metadata.json")
                    metadata = json.loads(metadata_json)
                    if "backup_name" not in metadata:
                        return False

                    # 额外检查：数据库文件大小
                    db_file_info = zipf.getinfo(db_filename)
                    logger.info(f"Backup database file size: {db_file_info.file_size} bytes")

                    if db_file_info.file_size < 1000:
                        logger.error(f"Backup database file is too small: {db_file_info.file_size} bytes")
                        return False

                    # 解压并验证数据库表
                    zipf.extractall(temp_dir)
                    restored_db = temp_dir / db_filename

                    if not restored_db.exists():
                        logger.error("Database file not found after extraction")
                        return False

                    # 验证数据库包含表
                    connect_args = {"check_same_thread": False} if "sqlite" in str(settings.DATABASE_URL) else {}
                    temp_engine = create_engine(
                        f"sqlite:///{str(restored_db).replace(chr(92), '/')}",
                        connect_args=connect_args
                    )

                    with temp_engine.connect() as conn:
                        required_tables = ['users', 'systems', 'diaries']
                        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                        existing_tables = [row[0] for row in result]
                        logger.info(f"Tables in backup: {existing_tables}")

                        # 使用大小写不敏感比较（SQLite 表名可能返回不同大小写）
                        existing_tables_lower = [t.lower() for t in existing_tables]
                        missing = [t for t in required_tables if t.lower() not in existing_tables_lower]
                        if missing:
                            logger.error(f"Backup missing required tables: {missing}")
                            temp_engine.dispose()
                            return False

                    temp_engine.dispose()
                    return True

            finally:
                # 清理临时目录
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)

        except Exception as e:
            print(f"[ERROR] Backup verification failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    def _verify_restored_database(self) -> bool:
        """
        验证恢复后的数据库是否有效

        检查数据库文件是否存在且包含必要的表
        """
        import time

        # 等待文件写入完成
        time.sleep(0.5)

        # 检查数据库文件是否存在
        db_path_str = str(self.db_path.resolve())
        logger.info(f"Verifying database at path: {db_path_str}")

        if not self.db_path.exists():
            logger.error(f"Restored database file does not exist: {self.db_path}")
            return False

        # 检查数据库文件大小（空文件或太小的文件可能是无效的）
        db_size = self.db_path.stat().st_size
        logger.info(f"Restored database file size: {db_size} bytes")
        if db_size < 1000:  # 少于1KB的数据库基本是空的或无效的
            logger.warning(f"Restored database file is too small: {db_size} bytes")
            # 允许恢复，但记录警告

        # 尝试连接数据库并检查表
        try:
            # 创建临时引擎来验证数据库
            connect_args = {"check_same_thread": False} if "sqlite" in str(settings.DATABASE_URL) else {}
            # 使用绝对路径并确保正确的 SQLite URL 格式
            temp_engine = create_engine(
                f"sqlite:///{db_path_str.replace(chr(92), '/')}",
                connect_args=connect_args
            )

            logger.info(f"Created temp engine, checking tables...")

            with temp_engine.connect() as conn:
                # 检查必需表是否存在
                required_tables = ['users', 'systems', 'diaries']
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                existing_tables = [row[0] for row in result]

                logger.info(f"Existing tables in restored database: {existing_tables}")

                # 使用大小写不敏感比较（SQLite 表名可能返回不同大小写）
                existing_tables_lower = [t.lower() for t in existing_tables]
                missing_tables = [t for t in required_tables if t.lower() not in existing_tables_lower]
                if missing_tables:
                    logger.error(f"Missing required tables in restored database: {missing_tables}")
                    temp_engine.dispose()
                    return False

                # 测试查询
                conn.execute(text("SELECT 1"))
                logger.info("Restored database verified successfully")

            temp_engine.dispose()
            return True

        except Exception as e:
            logger.error(f"Failed to verify restored database: {e}")
            import traceback
            logger.error(traceback.format_exc())
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
    from backend.models import (
        User, UserSettings, System, Diary, Insight,
        SystemLog, SystemAction, MealDeviation, SystemScoreLog,
        DiaryAttachment, DiaryEditHistory
    )

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
            "version": "1.1.0",
            "users": [],
            "user_settings": [],
            "systems": [],
            "system_logs": [],
            "system_actions": [],
            "meal_deviations": [],
            "system_score_logs": [],
            "diaries": [],
            "diary_attachments": [],
            "diary_edit_history": [],
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

        # 导出系统日志
        for log in db.query(SystemLog).all():
            data["system_logs"].append({
                "id": log.id,
                "system_id": log.system_id,
                "label": log.label,
                "value": log.value,
                "meta_data": log.meta_data,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })

        # 导出系统行动项
        for action in db.query(SystemAction).all():
            data["system_actions"].append({
                "id": action.id,
                "system_id": action.system_id,
                "text": action.text,
                "completed": action.completed,
                "created_at": action.created_at.isoformat() if action.created_at else None,
                "updated_at": action.updated_at.isoformat() if action.updated_at else None
            })

        # 导出饮食偏离事件
        for deviation in db.query(MealDeviation).all():
            data["meal_deviations"].append({
                "id": deviation.id,
                "system_id": deviation.system_id,
                "description": deviation.description,
                "occurred_at": deviation.occurred_at.isoformat() if deviation.occurred_at else None,
                "created_at": deviation.created_at.isoformat() if deviation.created_at else None
            })

        # 导出系统评分变化日志
        for score_log in db.query(SystemScoreLog).all():
            data["system_score_logs"].append({
                "id": score_log.id,
                "system_id": score_log.system_id,
                "old_score": score_log.old_score,
                "new_score": score_log.new_score,
                "change_reason": score_log.change_reason,
                "related_id": score_log.related_id,
                "created_at": score_log.created_at.isoformat() if score_log.created_at else None
            })

        # 导出日记附件
        for attachment in db.query(DiaryAttachment).all():
            data["diary_attachments"].append({
                "id": attachment.id,
                "diary_id": attachment.diary_id,
                "filename": attachment.filename,
                "file_path": attachment.file_path,
                "file_type": attachment.file_type,
                "file_size": attachment.file_size,
                "created_at": attachment.created_at.isoformat() if attachment.created_at else None
            })

        # 导出日记编辑历史
        for history in db.query(DiaryEditHistory).all():
            data["diary_edit_history"].append({
                "id": history.id,
                "diary_id": history.diary_id,
                "title_snapshot": history.title_snapshot,
                "content_snapshot": history.content_snapshot,
                "created_at": history.created_at.isoformat() if history.created_at else None
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
    from backend.models import (
        User, UserSettings, System, Diary, Insight,
        SystemLog, SystemAction, MealDeviation, SystemScoreLog,
        DiaryAttachment, DiaryEditHistory
    )
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
        "system_logs": 0,
        "system_actions": 0,
        "meal_deviations": 0,
        "system_score_logs": 0,
        "diaries": 0,
        "diary_attachments": 0,
        "diary_edit_history": 0,
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

        # 导入用户设置
        if "user_settings" in data:
            for setting_data in data["user_settings"]:
                existing = db.query(UserSettings).filter(UserSettings.id == setting_data["id"]).first()
                if existing:
                    existing.user_id = setting_data.get("user_id")
                    existing.theme = setting_data.get("theme")
                    existing.language = setting_data.get("language")
                    existing.auto_save_enabled = setting_data.get("auto_save_enabled")
                    existing.auto_save_interval = setting_data.get("auto_save_interval")
                    existing.notification_enabled = setting_data.get("notification_enabled")
                    existing.notification_time = setting_data.get("notification_time")
                    existing.show_year_progress = setting_data.get("show_year_progress")
                    existing.show_weekday = setting_data.get("show_weekday")
                    existing.pin_verify_on_startup = setting_data.get("pin_verify_on_startup")
                    existing.pin_verify_for_private_journal = setting_data.get("pin_verify_for_private_journal")
                    existing.pin_verify_for_data_export = setting_data.get("pin_verify_for_data_export")
                    existing.pin_verify_for_settings_change = setting_data.get("pin_verify_for_settings_change")
                else:
                    user_setting = UserSettings(
                        id=setting_data["id"],
                        user_id=setting_data.get("user_id"),
                        theme=setting_data.get("theme"),
                        language=setting_data.get("language"),
                        auto_save_enabled=setting_data.get("auto_save_enabled"),
                        auto_save_interval=setting_data.get("auto_save_interval"),
                        notification_enabled=setting_data.get("notification_enabled"),
                        notification_time=setting_data.get("notification_time"),
                        show_year_progress=setting_data.get("show_year_progress"),
                        show_weekday=setting_data.get("show_weekday"),
                        pin_verify_on_startup=setting_data.get("pin_verify_on_startup"),
                        pin_verify_for_private_journal=setting_data.get("pin_verify_for_private_journal"),
                        pin_verify_for_data_export=setting_data.get("pin_verify_for_data_export"),
                        pin_verify_for_settings_change=setting_data.get("pin_verify_for_settings_change")
                    )
                    db.add(user_setting)
                stats["user_settings"] += 1

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

        # 导入系统日志
        if "system_logs" in data:
            for log_data in data["system_logs"]:
                existing = db.query(SystemLog).filter(SystemLog.id == log_data["id"]).first()
                if existing:
                    existing.system_id = log_data.get("system_id")
                    existing.label = log_data.get("label")
                    existing.value = log_data.get("value")
                    existing.meta_data = log_data.get("meta_data")
                else:
                    system_log = SystemLog(
                        id=log_data["id"],
                        system_id=log_data.get("system_id"),
                        label=log_data.get("label"),
                        value=log_data.get("value"),
                        meta_data=log_data.get("meta_data"),
                        created_at=dt.fromisoformat(log_data["created_at"]) if log_data.get("created_at") else None
                    )
                    db.add(system_log)
                stats["system_logs"] += 1

        # 导入系统行动项
        if "system_actions" in data:
            for action_data in data["system_actions"]:
                existing = db.query(SystemAction).filter(SystemAction.id == action_data["id"]).first()
                if existing:
                    existing.system_id = action_data.get("system_id")
                    existing.text = action_data.get("text")
                    existing.completed = action_data.get("completed")
                    if action_data.get("updated_at"):
                        existing.updated_at = dt.fromisoformat(action_data["updated_at"])
                else:
                    system_action = SystemAction(
                        id=action_data["id"],
                        system_id=action_data.get("system_id"),
                        text=action_data.get("text"),
                        completed=action_data.get("completed"),
                        created_at=dt.fromisoformat(action_data["created_at"]) if action_data.get("created_at") else None,
                        updated_at=dt.fromisoformat(action_data["updated_at"]) if action_data.get("updated_at") else None
                    )
                    db.add(system_action)
                stats["system_actions"] += 1

        # 导入饮食偏离事件
        if "meal_deviations" in data:
            for deviation_data in data["meal_deviations"]:
                existing = db.query(MealDeviation).filter(MealDeviation.id == deviation_data["id"]).first()
                if existing:
                    existing.system_id = deviation_data.get("system_id")
                    existing.description = deviation_data.get("description")
                    existing.occurred_at = dt.fromisoformat(deviation_data["occurred_at"]) if deviation_data.get("occurred_at") else None
                else:
                    meal_deviation = MealDeviation(
                        id=deviation_data["id"],
                        system_id=deviation_data.get("system_id"),
                        description=deviation_data.get("description"),
                        occurred_at=dt.fromisoformat(deviation_data["occurred_at"]) if deviation_data.get("occurred_at") else None,
                        created_at=dt.fromisoformat(deviation_data["created_at"]) if deviation_data.get("created_at") else None
                    )
                    db.add(meal_deviation)
                stats["meal_deviations"] += 1

        # 导入系统评分变化日志
        if "system_score_logs" in data:
            for score_log_data in data["system_score_logs"]:
                existing = db.query(SystemScoreLog).filter(SystemScoreLog.id == score_log_data["id"]).first()
                if existing:
                    existing.system_id = score_log_data.get("system_id")
                    existing.old_score = score_log_data.get("old_score")
                    existing.new_score = score_log_data.get("new_score")
                    existing.change_reason = score_log_data.get("change_reason")
                    existing.related_id = score_log_data.get("related_id")
                else:
                    system_score_log = SystemScoreLog(
                        id=score_log_data["id"],
                        system_id=score_log_data.get("system_id"),
                        old_score=score_log_data.get("old_score"),
                        new_score=score_log_data.get("new_score"),
                        change_reason=score_log_data.get("change_reason"),
                        related_id=score_log_data.get("related_id"),
                        created_at=dt.fromisoformat(score_log_data["created_at"]) if score_log_data.get("created_at") else None
                    )
                    db.add(system_score_log)
                stats["system_score_logs"] += 1

        # 导入日记附件
        if "diary_attachments" in data:
            for attachment_data in data["diary_attachments"]:
                existing = db.query(DiaryAttachment).filter(DiaryAttachment.id == attachment_data["id"]).first()
                if existing:
                    existing.diary_id = attachment_data.get("diary_id")
                    existing.filename = attachment_data.get("filename")
                    existing.file_path = attachment_data.get("file_path")
                    existing.file_type = attachment_data.get("file_type")
                    existing.file_size = attachment_data.get("file_size")
                else:
                    diary_attachment = DiaryAttachment(
                        id=attachment_data["id"],
                        diary_id=attachment_data.get("diary_id"),
                        filename=attachment_data.get("filename"),
                        file_path=attachment_data.get("file_path"),
                        file_type=attachment_data.get("file_type"),
                        file_size=attachment_data.get("file_size"),
                        created_at=dt.fromisoformat(attachment_data["created_at"]) if attachment_data.get("created_at") else None
                    )
                    db.add(diary_attachment)
                stats["diary_attachments"] += 1

        # 导入日记编辑历史
        if "diary_edit_history" in data:
            for history_data in data["diary_edit_history"]:
                existing = db.query(DiaryEditHistory).filter(DiaryEditHistory.id == history_data["id"]).first()
                if existing:
                    existing.diary_id = history_data.get("diary_id")
                    existing.title_snapshot = history_data.get("title_snapshot")
                    existing.content_snapshot = history_data.get("content_snapshot")
                else:
                    diary_edit_history = DiaryEditHistory(
                        id=history_data["id"],
                        diary_id=history_data.get("diary_id"),
                        title_snapshot=history_data.get("title_snapshot"),
                        content_snapshot=history_data.get("content_snapshot"),
                        created_at=dt.fromisoformat(history_data["created_at"]) if history_data.get("created_at") else None
                    )
                    db.add(diary_edit_history)
                stats["diary_edit_history"] += 1

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
