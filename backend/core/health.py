"""健康检查 API"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    """根路径健康检查"""
    return {"status": "healthy", "service": "Life Canvas OS Backend"}

@router.get("/ping")
async def ping():
    """Ping 检查"""
    return {"action": "pong"}
