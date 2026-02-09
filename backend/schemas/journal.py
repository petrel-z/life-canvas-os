"""日记相关 Schema"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List, Any, Dict
from datetime import datetime


# 情绪类型
MoodType = Literal["great", "good", "neutral", "bad", "terrible"]


# ============ 日记 ============
class DiaryBase(BaseModel):
    """日记基础"""
    title: str = Field(..., min_length=1, max_length=200, description="标题")
    content: str = Field(..., min_length=1, description="内容")
    mood: Optional[MoodType] = Field(None, description="心情")
    tags: Optional[str] = Field(None, description="标签（JSON 数组字符串）")
    related_system: Optional[str] = Field(None, description="关联系统类型")
    is_private: bool = Field(default=False, description="是否私密")


class DiaryCreate(DiaryBase):
    """创建日记"""
    pass


class DiaryUpdate(BaseModel):
    """更新日记（所有字段可选）"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    mood: Optional[MoodType] = None
    tags: Optional[str] = None
    related_system: Optional[str] = None
    is_private: Optional[bool] = None


class DiaryResponse(DiaryBase):
    """日记响应"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DiaryDeleteResponse(BaseModel):
    """删除日记响应"""
    deleted_id: int


# ============ 日记查询参数 ============
class DiaryListParams(BaseModel):
    """日记列表查询参数"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    mood: Optional[MoodType] = None
    related_system: Optional[str] = None
    sort_by: str = "created_at"
    sort_order: Literal["asc", "desc"] = "desc"


# ============ 日记附件 ============
class DiaryAttachmentBase(BaseModel):
    """日记附件基础"""
    filename: str = Field(..., max_length=255)
    file_path: str = Field(..., max_length=500)
    file_type: Literal["image", "pdf", "docx", "video"] = ...
    file_size: int = Field(..., ge=0)


class DiaryAttachmentResponse(DiaryAttachmentBase):
    """日记附件响应"""
    id: int
    diary_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 日记编辑历史 ============
class DiaryEditHistoryResponse(BaseModel):
    """日记编辑历史响应"""
    id: int
    diary_id: int
    title_snapshot: str
    content_snapshot: str
    created_at: datetime

    class Config:
        from_attributes = True
