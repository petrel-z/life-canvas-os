"""测试 API 接口"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import datetime

router = APIRouter(prefix="/api/test", tags=["test"])


class TestResponse(BaseModel):
    """测试响应模型"""
    message: str
    timestamp: str
    data: dict


class TestRequest(BaseModel):
    """测试请求模型"""
    name: Optional[str] = "World"
    count: Optional[int] = 0


@router.get("/hello", response_model=TestResponse)
async def hello_world():
    """简单的 Hello World 接口"""
    return TestResponse(
        message="Hello from Python Backend!",
        timestamp=datetime.datetime.now().isoformat(),
        data={
            "status": "success",
            "backend": "FastAPI",
            "version": "0.0.1"
        }
    )


@router.post("/echo", response_model=TestResponse)
async def echo_test(request: TestRequest):
    """回显测试接口"""
    return TestResponse(
        message=f"Hello, {request.name}!",
        timestamp=datetime.datetime.now().isoformat(),
        data={
            "received_name": request.name,
            "received_count": request.count,
            "status": "echo successful"
        }
    )


@router.get("/info")
async def get_system_info():
    """获取系统信息"""
    import platform
    import sys

    return {
        "python_version": sys.version,
        "platform": platform.system(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "fastapi_running": True,
        "timestamp": datetime.datetime.now().isoformat()
    }
