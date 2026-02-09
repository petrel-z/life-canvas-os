"""系统维度模型（八维系统）"""
from sqlalchemy import Column, Integer, String, JSON, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from backend.db.base import Base


class System(Base):
    """系统基础表（八维系统）"""
    __tablename__ = "systems"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)
    type = Column(String, nullable=False, index=True)  # FUEL, PHYSICAL, etc.
    score = Column(Integer, default=50)  # 系统评分 0-100

    # 各系统专属详情（JSON 格式存储）
    details = Column(JSON, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SystemLog(Base):
    """系统日志表"""
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey("systems.id"), nullable=False)
    label = Column(String(100), nullable=False)  # 日志标签
    value = Column(Text, nullable=False)  # 日志内容
    meta_data = Column(JSON, nullable=True)  # 额外元数据（JSON 格式）

    created_at = Column(DateTime, server_default=func.now())


class SystemAction(Base):
    """系统行动项表"""
    __tablename__ = "system_actions"

    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey("systems.id"), nullable=False)
    text = Column(String(500), nullable=False)  # 行动项内容
    completed = Column(Integer, default=0)  # 0 或 1

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# 系统类型枚举
SYSTEM_TYPES = [
    "FUEL",         # 饮食系统
    "PHYSICAL",     # 运动系统
    "INTELLECTUAL", # 智力系统
    "OUTPUT",       # 输出系统
    "RECOVERY",     # 恢复系统
    "ASSET",        # 资产系统
    "CONNECTION",   # 连接系统
    "ENVIRONMENT",  # 环境系统
]

# 默认系统详情配置（初始化时使用）
DEFAULT_SYSTEM_DETAILS = {
    "FUEL": {
        "consistency": 100,
        "baseline_breakfast": "{}",
        "baseline_lunch": "{}",
        "baseline_dinner": "{}",
        "baseline_snacks": "[]",
        "total_deviations": 0,
        "monthly_deviations": 0,
    },
    "PHYSICAL": {
        "weekly_goal_minutes": 150,
        "current_week_minutes": 0,
    },
    "INTELLECTUAL": {
        "monthly_goal_pages": 200,
        "current_month_pages": 0,
    },
    "OUTPUT": {
        "daily_goal_hours": 4,
        "today_hours": 0,
    },
    "RECOVERY": {
        "sleep_goal_hours": 8,
        "avg_sleep_hours": 0,
    },
    "ASSET": {
        "monthly_savings_goal": 5000,
        "current_month_savings": 0,
    },
    "CONNECTION": {
        "weekly_social_goal": 3,
        "current_week_count": 0,
    },
    "ENVIRONMENT": {
        "cleanliness_score": 80,
    },
}
