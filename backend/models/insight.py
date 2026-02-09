"""AI 洞察模型"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.db.base import Base


class Insight(Base):
    """洞察表"""
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)

    # 洞察内容（JSON 数组字符串）
    # 格式：[{"category": "饮食", "insight": "最近饮食一致性较高"}]
    content = Column(JSON, nullable=False)

    # 系统评分快照（记录生成时的评分）
    # 格式：{"FUEL": 75, "PHYSICAL": 60, ...}
    system_scores = Column(JSON, nullable=False)

    # 使用的 AI 提供商
    provider_used = Column(String, nullable=False)  # deepseek, doubao, openai

    generated_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())


# AI 提供商枚举
AI_PROVIDERS = ["deepseek", "doubao", "openai"]
