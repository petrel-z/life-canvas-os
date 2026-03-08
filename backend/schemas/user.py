"""用户相关 Schema"""
from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, Literal
from datetime import datetime, date


# ============ 16 种有效 MBTI 类型 ============
VALID_MBTI_TYPES = {
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
}


# ============ 用户信息 ============
class UserBase(BaseModel):
    """用户基础信息"""
    display_name: Optional[str] = Field(None, max_length=100, description="显示名称")
    birthday: Optional[date] = Field(None, description="生日")
    mbti: Optional[str] = Field(None, min_length=4, max_length=4, description="MBTI 类型")
    values: Optional[str] = Field(None, description="价值观列表（JSON 数组字符串）")
    life_expectancy: Optional[int] = Field(None, ge=50, le=120, description="期望寿命")

    @field_validator('mbti')
    @classmethod
    def validate_mbti(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if not v.isalpha():
            raise ValueError('MBTI 必须是 4 位字母')
        upper = v.upper()
        if upper not in VALID_MBTI_TYPES:
            raise ValueError(
                f'无效的 MBTI 类型: {upper}，必须是以下 16 种之一: '
                f'{", ".join(sorted(VALID_MBTI_TYPES))}'
            )
        return upper


class UserCreate(UserBase):
    """创建用户"""
    pass


class UserUpdate(UserBase):
    """更新用户信息（所有字段可选）"""
    # 覆盖 birthday 为字符串格式（便于 JSON 解析）
    birthday: Optional[str] = Field(None, description="生日字符串 YYYY-MM-DD")


class UserResponse(UserBase):
    """用户响应"""
    id: int
    username: str
    created_at: datetime
    updated_at: datetime

    # 时间戳字段（前端使用，无时区歧义）
    @computed_field
    @property
    def created_at_ts(self) -> int:
        """创建时间戳（毫秒）"""
        return int(self.created_at.timestamp() * 1000)

    @computed_field
    @property
    def updated_at_ts(self) -> int:
        """更新时间戳（毫秒）"""
        return int(self.updated_at.timestamp() * 1000)

    class Config:
        from_attributes = True


# ============ 用户设置 ============
class UserSettingsBase(BaseModel):
    """用户设置基础"""
    theme: Literal["light", "dark", "auto"] = "dark"
    language: str = "zh-CN"
    auto_save_enabled: bool = True
    auto_save_interval: int = Field(default=60, ge=10, le=600, description="自动保存间隔（秒）")
    notification_enabled: bool = True
    notification_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$", description="通知时间 HH:mm")
    show_year_progress: bool = True
    show_weekday: bool = True
    # PIN验证开关
    pin_verify_on_startup: bool = True
    pin_verify_for_private_journal: bool = True
    pin_verify_for_data_export: bool = True
    pin_verify_for_settings_change: bool = True


class UserSettingsUpdate(BaseModel):
    """更新用户设置（所有字段可选）"""
    theme: Optional[Literal["light", "dark", "auto"]] = None
    language: Optional[str] = None
    auto_save_enabled: Optional[bool] = None
    auto_save_interval: Optional[int] = Field(None, ge=10, le=600)
    notification_enabled: Optional[bool] = None
    notification_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    show_year_progress: Optional[bool] = None
    show_weekday: Optional[bool] = None
    # PIN验证开关（可选）
    pin_verify_on_startup: Optional[bool] = None
    pin_verify_for_private_journal: Optional[bool] = None
    pin_verify_for_data_export: Optional[bool] = None
    pin_verify_for_settings_change: Optional[bool] = None


class UserSettingsResponse(UserSettingsBase):
    """用户设置响应"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    # 时间戳字段（前端使用，无时区歧义）
    @computed_field
    @property
    def created_at_ts(self) -> int:
        """创建时间戳（毫秒）"""
        return int(self.created_at.timestamp() * 1000)

    @computed_field
    @property
    def updated_at_ts(self) -> int:
        """更新时间戳（毫秒）"""
        return int(self.updated_at.timestamp() * 1000)

    class Config:
        from_attributes = True


# ============ AI 配置 ============
AIProvider = Literal["deepseek", "doubao"]


class AIConfigBase(BaseModel):
    """AI 配置基础"""
    provider: AIProvider
    api_key: str = Field(..., min_length=1, description="API Key")
    model_name: Optional[str] = Field(None, description="模型名称")


class AIConfigCreate(AIConfigBase):
    """创建 AI 配置"""
    pass


class AIConfigUpdate(BaseModel):
    """更新 AI 配置"""
    provider: Optional[AIProvider] = None
    api_key: Optional[str] = Field(None, min_length=1)
    model_name: Optional[str] = None


class AIConfigResponse(BaseModel):
    """AI 配置响应（不返回完整 API Key）"""
    provider: str
    model_name: Optional[str] = None
    api_key_masked: str = Field(description="掩码后的 API Key，如 sk-****...")
    updated_at: datetime

    # 时间戳字段（前端使用，无时区歧义）
    @computed_field
    @property
    def updated_at_ts(self) -> int:
        """更新时间戳（毫秒）"""
        return int(self.updated_at.timestamp() * 1000)

    class Config:
        from_attributes = True


# ============ PIN 码 ============
class PinSetupRequest(BaseModel):
    """设置 PIN 码请求"""
    pin: str = Field(..., pattern=r"^\d{6}$", description="6 位数字 PIN 码")


class PinVerifyRequest(BaseModel):
    """验证 PIN 码请求"""
    pin: str = Field(..., pattern=r"^\d{6}$", description="6 位数字 PIN 码")


class PinChangeRequest(BaseModel):
    """修改 PIN 码请求"""
    old_pin: str = Field(..., pattern=r"^\d{6}$", description="旧 PIN 码")
    new_pin: str = Field(..., pattern=r"^\d{6}$", description="新 PIN 码")


class PinVerifyResponse(BaseModel):
    """PIN 码验证响应"""
    verified: bool
    user_id: int


class PinSetupResponse(BaseModel):
    """PIN 码设置响应"""
    redirect_to: str = "/canvas"


class LockResponse(BaseModel):
    """锁定应用响应"""
    locked_at: datetime
