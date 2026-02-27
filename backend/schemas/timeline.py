"""审计时间轴 Schema"""
from pydantic import BaseModel, Field
from typing import List, Literal


# 事件类型过滤
TimelineEventType = Literal["all", "diary", "diet"]


class TimelineEventItem(BaseModel):
    """时间轴中的单个事件"""
    id: str = Field(..., description="事件唯一标识，格式: diary_123 或 diet_456")
    type: Literal["diary", "diet"] = Field(..., description="事件类型")
    title: str = Field(..., description="事件标题")
    content: str = Field(..., description="事件内容")
    time: str = Field(..., description="时间字符串，格式: HH:MM")
    timestamp: int = Field(..., description="毫秒时间戳，用于前端排序")


class TimelineDateGroup(BaseModel):
    """时间轴中的日期分组"""
    date: str = Field(..., description="日期字符串，格式: YYYY年MM月DD日")
    events: List[TimelineEventItem] = Field(default_factory=list, description="该日期下的事件列表")


class TimelineResponse(BaseModel):
    """时间轴响应"""
    timeline: List[TimelineDateGroup] = Field(default_factory=list, description="时间轴数据")
    total_events: int = Field(default=0, description="总事件数")
    has_more: bool = Field(default=False, description="是否有更多数据")


class TimelineListParams(BaseModel):
    """时间轴查询参数"""
    type: TimelineEventType = Field(default="all", description="事件类型过滤：all, diary, diet")
    page: int = Field(default=1, ge=1, description="页码，从 1 开始")
    page_size: int = Field(default=30, ge=1, le=100, description="每页数量")
