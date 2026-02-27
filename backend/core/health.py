"""健康检查 API"""
from fastapi import APIRouter

from backend.schemas.common import success_response

router = APIRouter()


@router.get("/")
async def root():
    """根路径健康检查"""
    return success_response(
        data={"service": "Life Canvas OS Backend"},
        message="healthy"
    )


@router.get("/ping")
async def ping():
    """Ping 检查"""
    return success_response(
        data={"action": "pong"},
        message="pong"
    )
