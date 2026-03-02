"""
用户服务 - 用户管理业务逻辑
"""
import base64
import httpx
from cryptography.fernet import Fernet
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from backend.models.user import User, UserSettings
from backend.schemas.user import UserResponse, UserUpdate, UserSettingsResponse, UserSettingsUpdate
from backend.schemas.common import error_response


# 加密密钥（实际应用中应该从环境变量或配置文件中读取）
ENCRYPTION_KEY = b'7ZmylayOdbwxCp_Lh_aU7OxsE5SGWRb1KV_Z0HygzXY='
cipher = Fernet(ENCRYPTION_KEY)


class UserService:
    """用户服务类"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取用户（单用户应用，默认返回第一个用户）"""
        return db.query(User).first()

    @staticmethod
    def get_user_profile(db: Session) -> Tuple[dict, int]:
        """
        获取用户信息

        Returns:
            (response_data, status_code)
        """
        user = UserService.get_user(db)

        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        return UserResponse.model_validate(user).model_dump(), 200

    @staticmethod
    def update_user_profile(db: Session, update_data: UserUpdate) -> Tuple[dict, int]:
        """
        更新用户信息

        Returns:
            (response_data, status_code)
        """
        user = UserService.get_user(db)

        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        # 更新字段
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(user, field):
                setattr(user, field, value)

        db.commit()
        db.refresh(user)

        return UserResponse.model_validate(user).model_dump(), 200

    @staticmethod
    def get_user_settings(db: Session) -> Tuple[dict, int]:
        """
        获取用户设置

        Returns:
            (response_data, status_code)
        """
        user = UserService.get_user(db)

        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        # 获取或创建设置
        settings = UserService.get_or_create_settings(db, user.id)

        return UserSettingsResponse.model_validate(settings).model_dump(), 200

    @staticmethod
    def update_user_settings(db: Session, update_data: UserSettingsUpdate) -> Tuple[dict, int]:
        """
        更新用户设置

        Returns:
            (response_data, status_code)
        """
        user = UserService.get_user(db)

        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        # 获取或创建设置
        settings = UserService.get_or_create_settings(db, user.id)

        # 更新字段
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(settings, field):
                setattr(settings, field, value)

        db.commit()
        db.refresh(settings)

        return UserSettingsResponse.model_validate(settings).model_dump(), 200

    @staticmethod
    def save_ai_config(db: Session, provider: str, api_key: str, model: Optional[str] = None) -> Tuple[dict, int]:
        """
        保存 AI 配置

        Returns:
            (response_data, status_code)
        """
        user = UserService.get_user(db)

        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        # 加密 API Key
        encrypted_key = UserService.encrypt_api_key(api_key)

        if not model:
            if provider.lower() == "deepseek":
                model = "deepseek-chat"
            elif provider.lower() == "doubao":
                model = "doubao-seed-2-0-lite-260215"

        # 保存配置
        ai_config = {
            "provider": provider,
            "api_key": encrypted_key,
            "model": model
        }

        user.ai_config = ai_config
        db.commit()

        return ai_config, 200

    @staticmethod
    def get_ai_config(db: Session) -> Tuple[Optional[Dict[str, Any]], int]:
        """
        获取 AI 配置

        Returns:
            (ai_config, status_code)
        """
        user = UserService.get_user(db)

        if not user:
            return None, 404

        return user.ai_config, 200

    @staticmethod
    def encrypt_api_key(api_key: str) -> str:
        """加密 API Key"""
        encrypted = cipher.encrypt(api_key.encode('utf-8'))
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')

    @staticmethod
    def decrypt_api_key(encrypted_key: str) -> str:
        """解密 API Key"""
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_key.encode('utf-8'))
        decrypted = cipher.decrypt(encrypted_bytes)
        return decrypted.decode('utf-8')

    @staticmethod
    def mask_api_key(api_key: str) -> str:
        """掩码 API Key，只显示前后几位"""
        if len(api_key) <= 10:
            return f"{api_key[:3]}***"
        return f"{api_key[:4]}{'*' * (len(api_key) - 8)}{api_key[-4:]}"

    @staticmethod
    def get_or_create_settings(db: Session, user_id: int) -> UserSettings:
        """获取或创建用户设置"""
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            settings = UserSettings(user_id=user_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings

    @staticmethod
    def update_user_profile_enhanced(db: Session, update_data: UserUpdate) -> Tuple[dict, int]:
        """
        更新用户信息（增强版，包含验证）

        Returns:
            (response_data, status_code)
        """
        user = UserService.get_user(db)

        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        # 更新字段（带验证）
        if update_data.display_name is not None:
            user.display_name = update_data.display_name

        if update_data.birthday is not None:
            try:
                user.birthday = datetime.strptime(update_data.birthday, "%Y-%m-%d").date()
            except ValueError:
                return error_response(
                    message="参数验证失败",
                    code=422,
                    data={
                        "errors": [
                            {
                                "field": "birthday",
                                "message": "生日格式错误",
                                "value": update_data.birthday
                            }
                        ]
                    }
                ), 422

        if update_data.mbti is not None:
            user.mbti = update_data.mbti.upper() if update_data.mbti else None

        if update_data.values is not None:
            user.values = update_data.values

        if update_data.life_expectancy is not None:
            if not (50 <= update_data.life_expectancy <= 120):
                return error_response(
                    message="参数验证失败",
                    code=422,
                    data={
                        "errors": [
                            {
                                "field": "life_expectancy",
                                "message": "期望寿命必须在 50-120 之间",
                                "value": update_data.life_expectancy
                            }
                        ]
                    }
                ), 422
            user.life_expectancy = update_data.life_expectancy

        db.commit()
        db.refresh(user)

        return UserResponse.model_validate(user).model_dump(), 200

    @staticmethod
    def get_ai_config_masked(db: Session) -> Tuple[Optional[Dict[str, Any]], int]:
        """
        获取 AI 配置（掩码 API Key）

        Returns:
            (ai_config_data, status_code)
        """
        user = UserService.get_user(db)

        if not user or not user.ai_config:
            return None, 404

        provider = user.ai_config.get("provider")
        model = user.ai_config.get("model")
        encrypted_key = user.ai_config.get("api_key")

        # 返回掩码后的 API Key
        masked_key = UserService.mask_api_key(encrypted_key) if encrypted_key else ""

        return {
            "provider": provider,
            "model_name": model,
            "api_key_masked": masked_key,
            "updated_at": user.updated_at.isoformat()
        }, 200

    @staticmethod
    async def verify_api_key(provider: str, api_key: str, model: Optional[str] = None) -> Tuple[dict, int]:
        """
        验证 API Key 有效性

        Args:
            provider: AI 提供商 (deepseek, openai, doubao)
            api_key: API Key
            model: 可选的模型名称

        Returns:
            (response_data, status_code)
        """
        try:
            if provider.lower() == "deepseek":
                return await UserService._verify_deepseek_key(api_key, model)
            elif provider.lower() == "openai":
                return await UserService._verify_openai_key(api_key, model)
            elif provider.lower() == "doubao":
                return await UserService._verify_doubao_key(api_key, model)
            else:
                return error_response(
                    message=f"不支持的 AI 提供商: {provider}",
                    code=400
                ), 400

        except httpx.TimeoutException:
            return error_response(
                message="API 请求超时，请检查网络连接",
                code=504
            ), 504
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return error_response(
                    message="API Key 无效或已过期",
                    code=401,
                    data={"provider": provider}
                ), 401
            elif e.response.status_code == 429:
                return error_response(
                    message="API 请求频率超限，请稍后再试",
                    code=429
                ), 429
            else:
                return error_response(
                    message=f"API 验证失败 (HTTP {e.response.status_code})",
                    code=502,
                    data={"provider": provider, "status_code": e.response.status_code}
                ), 502
        except Exception as e:
            return error_response(
                message=f"API Key 验证失败: {str(e)}",
                code=500
            ), 500

    @staticmethod
    async def _verify_deepseek_key(api_key: str, model: Optional[str] = None) -> Tuple[dict, int]:
        """验证 DeepSeek API Key"""
        url = "https://api.deepseek.com/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model or "deepseek-chat",
            "messages": [
                {"role": "user", "content": "Hi"}
            ],
            "max_tokens": 5
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()

        return {
            "valid": True,
            "provider": "deepseek",
            "model": model or "deepseek-chat"
        }, 200

    @staticmethod
    async def _verify_openai_key(api_key: str, model: Optional[str] = None) -> Tuple[dict, int]:
        """验证 OpenAI API Key"""
        url = "https://api.openai.com/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model or "gpt-3.5-turbo",
            "messages": [
                {"role": "user", "content": "Hi"}
            ],
            "max_tokens": 5
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()

        return {
            "valid": True,
            "provider": "openai",
            "model": model or "gpt-3.5-turbo"
        }, 200

    @staticmethod
    async def _verify_doubao_key(api_key: str, model: Optional[str] = None) -> Tuple[dict, int]:
        """验证豆包 API Key"""
        # 豆包 API 验证逻辑（需要根据实际 API 文档实现）
        # 这里暂时返回成功，实际使用时需要完善
        return {
            "valid": True,
            "provider": "doubao",
            "model": model or "doubao-seed-2-0-lite-260215",
            "note": "豆包 API 验证尚未完全实现"
        }, 200
