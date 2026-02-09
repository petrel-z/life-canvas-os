"""日记模型"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.db.base import Base


class Diary(Base):
    """日记表"""
    __tablename__ = "diaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)

    # 基本信息
    title = Column(String(200), nullable=False)  # 标题
    content = Column(Text, nullable=False)  # 内容（Markdown 或纯文本）

    # 元数据
    mood = Column(String, nullable=True)  # 心情: great, good, neutral, bad, terrible
    tags = Column(JSON, nullable=True)  # 标签数组（JSON 数组字符串）
    related_system = Column(String, nullable=True)  # 关联系统类型
    is_private = Column(Integer, default=0)  # 是否私密：0 或 1

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DiaryAttachment(Base):
    """日记附件表"""
    __tablename__ = "diary_attachments"

    id = Column(Integer, primary_key=True, index=True)
    diary_id = Column(Integer, ForeignKey("diaries.id"), nullable=False)

    # 附件信息
    filename = Column(String(255), nullable=False)  # 原始文件名
    file_path = Column(String(500), nullable=False)  # 存储路径
    file_type = Column(String(50), nullable=False)  # 文件类型：image, pdf, docx, video
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）

    created_at = Column(DateTime, server_default=func.now())


class DiaryEditHistory(Base):
    """日记编辑历史表"""
    __tablename__ = "diary_edit_history"

    id = Column(Integer, primary_key=True, index=True)
    diary_id = Column(Integer, ForeignKey("diaries.id"), nullable=False)

    # 编辑快照
    title_snapshot = Column(String(200), nullable=False)
    content_snapshot = Column(Text, nullable=False)

    created_at = Column(DateTime, server_default=func.now())


# 情绪类型枚举
MOOD_TYPES = ["great", "good", "neutral", "bad", "terrible"]
