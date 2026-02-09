"""系统相关 Schema（八维系统）"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, Any, Dict
from datetime import datetime


# 系统类型
SystemType = Literal[
    "FUEL", "PHYSICAL", "INTELLECTUAL", "OUTPUT",
    "RECOVERY", "ASSET", "CONNECTION", "ENVIRONMENT"
]


# ============ 系统 ============
class SystemBase(BaseModel):
    """系统基础"""
    type: SystemType
    score: int = Field(default=50, ge=0, le=100, description="系统评分 0-100")


class SystemCreate(SystemBase):
    """创建系统"""
    pass


class SystemUpdate(BaseModel):
    """更新系统"""
    score: int = Field(..., ge=0, le=100, description="系统评分 0-100")


class SystemResponse(SystemBase):
    """系统响应"""
    id: int
    user_id: int
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemScoreUpdate(BaseModel):
    """更新系统评分"""
    score: int = Field(..., ge=0, le=100)


class SystemScoreUpdateResponse(BaseModel):
    """系统评分更新响应"""
    id: int
    type: SystemType
    old_score: int
    new_score: int
    updated_at: datetime


# ============ 系统日志 ============
class SystemLogBase(BaseModel):
    """系统日志基础"""
    label: str = Field(..., max_length=100, description="日志标签")
    value: str = Field(..., description="日志内容")
    meta_data: Optional[Dict[str, Any]] = Field(default=None, description="额外元数据")


class SystemLogCreate(SystemLogBase):
    """创建系统日志"""
    pass


class SystemLogResponse(SystemLogBase):
    """系统日志响应"""
    id: int
    system_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 系统行动项 ============
class SystemActionBase(BaseModel):
    """系统行动项基础"""
    text: str = Field(..., max_length=500, description="行动项内容")
    completed: bool = False


class SystemActionCreate(SystemActionBase):
    """创建系统行动项"""
    pass


class SystemActionUpdate(BaseModel):
    """更新系统行动项"""
    text: Optional[str] = Field(None, max_length=500)
    completed: Optional[bool] = None


class SystemActionResponse(SystemActionBase):
    """系统行动项响应"""
    id: int
    system_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemActionDeleteResponse(BaseModel):
    """删除行动项响应"""
    deleted_id: int


# ============ 查询参数 ============
class SystemListParams(BaseModel):
    """系统列表查询参数"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = "score"
    sort_order: Literal["asc", "desc"] = "desc"


class SystemLogListParams(BaseModel):
    """系统日志查询参数"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    sort_by: str = "created_at"
    sort_order: Literal["asc", "desc"] = "desc"
