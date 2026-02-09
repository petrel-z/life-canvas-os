"""请求限流和超时处理中间件"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """请求限流器"""

    def __init__(self):
        # 存储每个 IP 的请求记录 {ip: [(timestamp, timestamp), ...]}
        self.requests: Dict[str, list] = defaultdict(list)

        # 限流配置（每分钟请求数）
        self.rate_limits = {
            "default": 60,  # 默认 60 次/分钟
            "auth": 5,  # 认证接口 5 次/分钟
            "sensitive": 10  # 敏感操作 10 次/分钟
        }

    def is_allowed(self, ip: str, endpoint_type: str = "default") -> tuple[bool, dict]:
        """
        检查是否允许请求

        Args:
            ip: 客户端 IP
            endpoint_type: 端点类型

        Returns:
            (是否允许, 限制信息)
        """
        now = datetime.now()
        minute_ago = now - timedelta(minutes=1)

        # 获取限流配置
        limit = self.rate_limits.get(endpoint_type, self.rate_limits["default"])

        # 清理超过 1 分钟的记录
        self.requests[ip] = [
            req_time for req_time in self.requests[ip]
            if req_time > minute_ago
        ]

        # 检查是否超过限制
        request_count = len(self.requests[ip])
        is_allowed = request_count < limit

        # 添加当前请求记录
        self.requests[ip].append(now)

        # 返回限制信息
        limit_info = {
            "limit": limit,
            "remaining": max(0, limit - request_count - 1),
            "reset": (now + timedelta(seconds=60)).isoformat()
        }

        return is_allowed, limit_info


# 全局限流器实例
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """请求限流中间件"""

    async def dispatch(self, request: Request, call_next):
        # 获取客户端 IP
        client_ip = self._get_client_ip(request)

        # 根据路径确定端点类型
        endpoint_type = self._get_endpoint_type(request.url.path)

        # 检查限流
        allowed, limit_info = rate_limiter.is_allowed(client_ip, endpoint_type)

        # 添加限流信息到响应头
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit_info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(limit_info["remaining"])
        response.headers["X-RateLimit-Reset"] = limit_info["reset"]

        if not allowed:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "code": 429,
                    "message": "请求过于频繁，请稍后再试",
                    "data": limit_info,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                }
            )

        return response

    def _get_client_ip(self, request: Request) -> str:
        """获取客户端 IP"""
        # 尝试从不同的头部获取真实 IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # 回退到直接连接的 IP
        if request.client:
            return request.client.host

        return "unknown"

    def _get_endpoint_type(self, path: str) -> str:
        """根据路径确定端点类型"""
        if "/pin/" in path:
            return "auth"
        if "/backup/" in path or "/import" in path:
            return "sensitive"
        return "default"


class TimeoutMiddleware(BaseHTTPMiddleware):
    """请求超时中间件"""

    def __init__(self, app, timeout: float = 30.0):
        super().__init__(app)
        self.timeout = timeout

    async def dispatch(self, request: Request, call_next):
        import asyncio

        try:
            # 使用超时包装器
            response = await asyncio.wait_for(
                call_next(request),
                timeout=self.timeout
            )
            return response

        except asyncio.TimeoutError:
            logger.warning(f"Request timeout: {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                content={
                    "code": 408,
                    "message": "请求超时",
                    "data": {"timeout": self.timeout},
                    "timestamp": int(datetime.now().timestamp() * 1000)
                }
            )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """安全头中间件"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # 添加安全头
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""

    async def dispatch(self, request: Request, call_next):
        start_time = datetime.now()

        # 记录请求
        logger.info(f"Request: {request.method} {request.url.path}", extra={
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": request.client.host if request.client else "unknown"
        })

        # 处理请求
        try:
            response = await call_next(request)

            # 计算处理时间
            process_time = (datetime.now() - start_time).total_seconds() * 1000

            # 记录响应
            logger.info(f"Response: {response.status_code}", extra={
                "status_code": response.status_code,
                "process_time_ms": round(process_time, 2),
                "path": request.url.path
            })

            # 添加处理时间到响应头
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

            return response

        except Exception as e:
            process_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(f"Request failed: {str(e)}", extra={
                "path": request.url.path,
                "process_time_ms": round(process_time, 2),
                "error": str(e)
            })
            raise
