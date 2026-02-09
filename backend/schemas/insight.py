"""洞察相关 Schema"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime


# AI 提供商类型
AIProvider = Literal["deepseek", "doubao", "openai"]


# ============ 洞察 ============
class InsightBase(BaseModel):
    """洞察基础"""
    content: List[Dict[str, str]] = Field(..., description="洞察内容列表")
    system_scores: Dict[str, int] = Field(..., description="系统评分快照")
    provider_used: AIProvider = Field(..., description="使用的 AI 提供商")


class InsightCreate(InsightBase):
    """创建洞察"""
    pass


class InsightResponse(InsightBase):
    """洞察响应"""
    id: int
    user_id: int
    generated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 生成洞察 ============
class InsightGenerateRequest(BaseModel):
    """生成洞察请求"""
    force: bool = Field(default=False, description="是否强制重新生成")


class InsightGenerateResponse(BaseModel):
    """生成洞察响应"""
    id: int
    user_id: int
    content: List[Dict[str, str]]
    system_scores: Dict[str, int]
    provider_used: AIProvider
    generated_at: datetime


# ============ 洞察查询参数 ============
class InsightListParams(BaseModel):
    """洞察列表查询参数"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=10, ge=1, le=100)
    sort_by: str = "generated_at"
    sort_order: Literal["asc", "desc"] = "desc"


# ============ 洞察项格式 ============
class InsightItem(BaseModel):
    """洞察单项"""
    category: str = Field(..., description="类别")
    insight: str = Field(..., description="洞察内容")
