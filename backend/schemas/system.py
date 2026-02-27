"""系统相关 Schema（八维系统）"""
from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, Literal, Any, Dict, List
from datetime import datetime


# 系统类型
SystemType = Literal[
    "FUEL", "PHYSICAL", "INTELLECTUAL", "OUTPUT",
    "DREAM", "ASSET", "CONNECTION", "ENVIRONMENT"
]


# ============ 饮食系统 ============

class MealItem(BaseModel):
    """餐食项"""
    name: str = Field(..., description="食物名称")
    amount: str = Field(..., description="分量（如：1碗、200g等）")
    calories: Optional[int] = Field(None, description="卡路里（可选）")


class FuelBaseline(BaseModel):
    """饮食基准"""
    breakfast: List[MealItem] = Field(default_factory=list, description="早餐基准")
    lunch: List[MealItem] = Field(default_factory=list, description="午餐基准")
    dinner: List[MealItem] = Field(default_factory=list, description="晚餐基准")
    taste: List[str] = Field(default_factory=list, description="口味偏好（如：清淡、微辣、麻辣等）")


class FuelBaselineUpdate(BaseModel):
    """更新饮食基准"""
    breakfast: Optional[List[MealItem]] = Field(None, description="早餐基准")
    lunch: Optional[List[MealItem]] = Field(None, description="午餐基准")
    dinner: Optional[List[MealItem]] = Field(None, description="晚餐基准")
    taste: Optional[List[str]] = Field(None, description="口味偏好")


# ============ 偏离事件 ============

class MealDeviationCreate(BaseModel):
    """创建偏离事件"""
    description: str = Field(..., description="偏离描述，如：多吃了零食、没有吃早餐")
    occurred_at: Optional[datetime] = Field(None, description="发生时间（默认当前时间）")


class MealDeviationUpdate(BaseModel):
    """更新偏离事件"""
    description: Optional[str] = Field(None, description="偏离描述")


class MealDeviationResponse(BaseModel):
    """偏离事件响应"""
    id: int
    system_id: int
    description: str
    occurred_at: datetime
    created_at: datetime

    # 时间戳字段（前端使用，无时区歧义）
    @computed_field
    @property
    def occurred_at_ts(self) -> int:
        """发生时间戳（毫秒）"""
        return int(self.occurred_at.timestamp() * 1000)

    @computed_field
    @property
    def created_at_ts(self) -> int:
        """创建时间戳（毫秒）"""
        return int(self.created_at.timestamp() * 1000)

    class Config:
        from_attributes = True


class FuelStatistics(BaseModel):
    """饮食统计"""
    total_deviations: int = Field(..., description="总偏离次数")
    monthly_deviations: int = Field(..., description="本月偏离次数")
    latest_deviation: Optional[datetime] = Field(None, description="最近一次偏离时间")


# ============ 系统 ============


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
