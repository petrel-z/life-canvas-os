"""通用 Schema（统一响应格式）"""
from pydantic import BaseModel, Field
from typing import Any, Optional, Generic, TypeVar
from datetime import datetime

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一 API 响应格式"""
    code: int = Field(default=200, description="业务状态码")
    message: str = Field(default="success", description="提示信息")
    data: Optional[T] = Field(default=None, description="业务数据")
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))

    class Config:
        json_schema_extra = {
            "example": {
                "code": 200,
                "message": "success",
                "data": {},
                "timestamp": 1707219200000
            }
        }


class PaginatedParams(BaseModel):
    """分页查询参数"""
    page: int = Field(default=1, ge=1, description="页码，从 1 开始")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量，最大 100")
    sort_by: str = Field(default="created_at", description="排序字段")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", description="排序方向")


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应格式"""
    items: list[T] = Field(default_factory=list, description="数据列表")
    total: int = Field(default=0, description="总记录数")
    page: int = Field(default=1, description="当前页码")
    page_size: int = Field(default=20, description="每页数量")
    total_pages: int = Field(default=0, description="总页数")
    has_next: bool = Field(default=False, description="是否有下一页")
    has_prev: bool = Field(default=False, description="是否有上一页")

    @classmethod
    def create(cls, items: list[T], total: int, page: int, page_size: int):
        """创建分页响应"""
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )


class ValidationError(BaseModel):
    """验证错误详情"""
    field: str = Field(description="字段名")
    message: str = Field(description="错误信息")
    value: Optional[Any] = Field(default=None, description="错误值")


class ErrorResponse(BaseModel):
    """错误响应格式"""
    code: int
    message: str
    data: Optional[dict] = Field(default=None, description="错误详情")
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))


# 创建便捷工厂函数
def success_response(data: Any = None, message: str = "success", code: int = 200) -> dict:
    """创建成功响应"""
    return {
        "code": code,
        "message": message,
        "data": data,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }


def error_response(message: str, code: int = 400, data: Any = None) -> dict:
    """创建错误响应"""
    response = {
        "code": code,
        "message": message,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }
    if data is not None:
        response["data"] = data
    return response
