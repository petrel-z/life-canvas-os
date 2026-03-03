"""
认证服务 - PIN 码管理业务逻辑
"""
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.schemas.user import PinSetupResponse, PinVerifyResponse
from backend.schemas.common import error_response


def _parse_datetime(dt):
    """解析日期时间（处理字符串或datetime对象）"""
    if dt is None:
        return None
    if isinstance(dt, str):
        # SQLite 返回 ISO 格式字符串，需要解析
        return datetime.fromisoformat(dt)
    return dt


class AuthService:
    """认证服务类"""

    @staticmethod
    def hash_pin(pin: str) -> str:
        """哈希 PIN 码"""
        salt = bcrypt.gensalt(rounds=10)
        return bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')

    @staticmethod
    def verify_pin_hash(pin: str, pin_hash: str) -> bool:
        """验证 PIN 码"""
        return bcrypt.checkpw(pin.encode('utf-8'), pin_hash.encode('utf-8'))

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取用户（单用户应用，默认返回第一个用户）"""
        return db.query(User).first()

    @staticmethod
    def create_default_user(db: Session) -> User:
        """创建默认用户"""
        user = User(username="Owner")
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def setup_pin(db: Session, pin: str) -> Tuple[dict, int]:
        """
        设置 PIN 码（首次）

        Returns:
            (response_data, status_code)
        """
        user = AuthService.get_user(db)

        # 检查是否已设置 PIN
        if user and user.pin_hash:
            return error_response(
                message="PIN 已设置",
                code=409,
                data={
                    "conflict": "PIN_ALREADY_SET",
                    "hint": "请使用 /api/pin/change 接口修改 PIN"
                }
            ), 409

        # 如果用户不存在，创建默认用户
        if not user:
            user = AuthService.create_default_user(db)

        # 哈希并保存 PIN
        user.pin_hash = AuthService.hash_pin(pin)
        user.pin_attempts = 0
        user.pin_locked_until = None
        db.commit()

        return PinSetupResponse().model_dump(), 200

    @staticmethod
    def verify_pin(db: Session, pin: str) -> Tuple[dict, int]:
        """
        验证 PIN 码

        Returns:
            (response_data, status_code)
        """
        user = AuthService.get_user(db)

        # 检查是否已设置 PIN
        if not user or not user.pin_hash:
            return error_response(
                message="PIN 未设置",
                code=424,
                data={"hint": "请先使用 /api/pin/setup 接口设置 PIN"}
            ), 424

        # 检查是否被锁定
        locked_until = _parse_datetime(user.pin_locked_until)
        if locked_until:
            if locked_until > datetime.now():
                # 仍在锁定中
                remaining_seconds = int((locked_until - datetime.now()).total_seconds())
                return error_response(
                    message="PIN 已锁定",
                    code=429,
                    data={"remaining_seconds": remaining_seconds}
                ), 429
            else:
                # 锁定已过期，重置失败次数和锁定状态
                user.pin_attempts = 0
                user.pin_locked_until = None
                db.commit()

        # 验证 PIN
        if AuthService.verify_pin_hash(pin, user.pin_hash):
            # 验证成功，重置失败次数
            user.pin_attempts = 0
            user.pin_locked_until = None
            db.commit()

            return PinVerifyResponse(
                verified=True,
                user_id=user.id
            ).model_dump(), 200
        else:
            # 验证失败，增加失败次数
            user.pin_attempts += 1
            remaining_attempts = 3 - user.pin_attempts

            # 检查是否需要锁定
            if user.pin_attempts >= 3:
                user.pin_locked_until = datetime.now() + timedelta(seconds=30)
                db.commit()
                return error_response(
                    message="PIN 验证失败次数过多，已锁定 30 秒",
                    code=429,
                    data={"remaining_seconds": 30}
                ), 429

            db.commit()

            return error_response(
                message="PIN 验证失败",
                code=401,
                data={"attempts_remaining": remaining_attempts}
            ), 401

    @staticmethod
    def change_pin(db: Session, old_pin: str, new_pin: str) -> Tuple[dict, int]:
        """
        修改 PIN 码

        Returns:
            (response_data, status_code)
        """
        user = AuthService.get_user(db)

        if not user or not user.pin_hash:
            return error_response(
                message="PIN 未设置",
                code=424,
            ), 424

        # 验证旧 PIN
        if not AuthService.verify_pin_hash(old_pin, user.pin_hash):
            return error_response(
                message="旧 PIN 验证失败",
                code=401
            ), 401

        # 更新为新 PIN
        user.pin_hash = AuthService.hash_pin(new_pin)
        user.pin_attempts = 0
        user.pin_locked_until = None
        db.commit()

        return None, 200

    @staticmethod
    def is_pin_locked(db: Session) -> bool:
        """检查 PIN 是否被锁定"""
        user = AuthService.get_user(db)
        if not user or not user.pin_locked_until:
            return False
        locked_until = _parse_datetime(user.pin_locked_until)
        return locked_until and locked_until > datetime.now()

    @staticmethod
    def get_pin_verify_requirements(db: Session) -> dict:
        """
        获取PIN验证要求

        Returns:
            包含各个功能PIN验证要求的字典
        """
        from backend.services.user_service import UserService

        user = AuthService.get_user(db)
        if not user:
            return {
                "has_pin": False,
                "requirements": {}
            }

        settings = UserService.get_or_create_settings(db, user.id)

        return {
            "has_pin": bool(user.pin_hash),
            "requirements": {
                "startup": bool(settings.pin_verify_on_startup),
                "private_journal": bool(settings.pin_verify_for_private_journal),
                "data_export": bool(settings.pin_verify_for_data_export),
                "settings_change": bool(settings.pin_verify_for_settings_change),
            }
        }

    @staticmethod
    def should_verify_on_startup(db: Session) -> bool:
        """检查启动时是否需要验证PIN"""
        user = AuthService.get_user(db)
        if not user or not user.pin_hash:
            return False

        from backend.services.user_service import UserService
        settings = UserService.get_or_create_settings(db, user.id)
        return bool(settings.pin_verify_on_startup)

    @staticmethod
    def should_verify_for_private_journal(db: Session) -> bool:
        """检查查看私密日记时是否需要验证PIN"""
        user = AuthService.get_user(db)
        if not user or not user.pin_hash:
            return False

        from backend.services.user_service import UserService
        settings = UserService.get_or_create_settings(db, user.id)
        return bool(settings.pin_verify_for_private_journal)

    @staticmethod
    def should_verify_for_data_export(db: Session) -> bool:
        """检查导出数据时是否需要验证PIN"""
        user = AuthService.get_user(db)
        if not user or not user.pin_hash:
            return False

        from backend.services.user_service import UserService
        settings = UserService.get_or_create_settings(db, user.id)
        return bool(settings.pin_verify_for_data_export)

    @staticmethod
    def should_verify_for_settings_change(db: Session) -> bool:
        """检查修改设置时是否需要验证PIN"""
        user = AuthService.get_user(db)
        if not user or not user.pin_hash:
            return False

        from backend.services.user_service import UserService
        settings = UserService.get_or_create_settings(db, user.id)
        return bool(settings.pin_verify_for_settings_change)
