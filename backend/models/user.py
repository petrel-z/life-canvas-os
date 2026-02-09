"""用户模型"""
from sqlalchemy import Column, Integer, String, JSON, DateTime, Date
from sqlalchemy.sql import func
from backend.db.base import Base


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, default="Owner")

    # 基本信息
    display_name = Column(String(100), nullable=True)  # 显示名称
    birthday = Column(Date, nullable=True)  # 生日
    mbti = Column(String(4), nullable=True)  # MBTI 类型
    values = Column(JSON, nullable=True)  # 价值观列表（JSON 数组字符串）
    life_expectancy = Column(Integer, default=85)  # 期望寿命

    # PIN 码
    pin_hash = Column(String, nullable=True)  # PIN 哈希
    pin_attempts = Column(Integer, default=0)  # 验证失败次数
    pin_locked_until = Column(DateTime, nullable=True)  # 锁定截止时间

    # 基础偏好（主题、语言、自动保存等）
    preferences = Column(JSON, default={})

    # AI 配置
    # 结构示例: {"provider": "deepseek", "api_key": "encrypted_key", "model": "deepseek-chat"}
    ai_config = Column(JSON, default={})

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class UserSettings(Base):
    """用户设置表"""
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, default=1)  # 单用户应用，默认为 1

    # 外观设置
    theme = Column(String, default="dark")  # light, dark, auto
    language = Column(String, default="zh-CN")  # 语言代码

    # 自动保存
    auto_save_enabled = Column(Integer, default=1)  # 0 或 1
    auto_save_interval = Column(Integer, default=60)  # 秒

    # 通知设置
    notification_enabled = Column(Integer, default=1)  # 0 或 1
    notification_time = Column(String, default="09:00")  # HH:mm

    # 显示设置
    show_year_progress = Column(Integer, default=1)  # 0 或 1
    show_weekday = Column(Integer, default=1)  # 0 或 1

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
