"""请求限流和超时处理中间件"""
import sys
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict
import logging
import time

logger = logging.getLogger(__name__)


class TokenBucket:
    """令牌桶数据结构"""

    def __init__(self, capacity: int, refill_rate: float):
        """
        初始化令牌桶

        Args:
            capacity: 桶容量（最大令牌数）
            refill_rate: 补充速率（每秒补充的令牌数）
        """
        self.capacity = capacity
        self.tokens = capacity  # 初始满桶
        self.refill_rate = refill_rate
        self.last_update = time.time()

    def refill(self):
        """补充令牌（基于时间流逝）"""
        now = time.time()
        elapsed = now - self.last_update
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
        self.last_update = now

    def consume(self, tokens: int = 1) -> bool:
        """
        消费令牌

        Args:
            tokens: 需要消费的令牌数

        Returns:
            是否成功消费
        """
        self.refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    def get_remaining(self) -> int:
        """获取剩余令牌数"""
        self.refill()
        return int(self.tokens)

    def get_wait_time(self, tokens: int = 1) -> float:
        """获取需要等待的时间（秒）"""
        self.refill()
        if self.tokens >= tokens:
            return 0.0
        tokens_needed = tokens - self.tokens
        return tokens_needed / self.refill_rate


class RateLimiter:
    """基于令牌桶的限流器"""

    def __init__(self):
        # 存储每个 IP 的令牌桶 {ip: {endpoint_type: TokenBucket}}
        self.buckets: Dict[str, Dict[str, TokenBucket]] = defaultdict(dict)

        # 限流配置（容量和补充速率）
        # 容量 = 最大突发请求数，refill_rate = 每秒补充的令牌数
        self.rate_limits = {
            "default": {"capacity": 120, "refill_rate": 2.0},   # 120 突发，平均 120 次/分钟
            "auth": {"capacity": 30, "refill_rate": 0.5},       # 30 突发，平均 30 次/分钟
            "sensitive": {"capacity": 30, "refill_rate": 0.5},  # 30 突发，平均 30 次/分钟
        }

    def is_allowed(self, ip: str, endpoint_type: str = "default", tokens: int = 1) -> tuple[bool, dict]:
        """
        检查是否允许请求（令牌桶算法）

        Args:
            ip: 客户端 IP
            endpoint_type: 端点类型
            tokens: 需要消费的令牌数（默认 1）

        Returns:
            (是否允许，限制信息)
        """
        # 获取限流配置
        config = self.rate_limits.get(endpoint_type, self.rate_limits["default"])
        capacity = config["capacity"]
        refill_rate = config["refill_rate"]

        # 获取或创建令牌桶
        if endpoint_type not in self.buckets[ip]:
            self.buckets[ip][endpoint_type] = TokenBucket(capacity, refill_rate)

        bucket = self.buckets[ip][endpoint_type]

        # 尝试消费令牌
        is_allowed = bucket.consume(tokens)

        # 计算重置时间（桶满所需时间）
        wait_time = bucket.get_wait_time(capacity)
        reset_time = datetime.now() + timedelta(seconds=wait_time)

        # 定期清理空闲记录（防止内存泄漏）
        self._cleanup_idle_buckets(ip)

        # 返回限制信息
        limit_info = {
            "limit": capacity,
            "remaining": bucket.get_remaining(),
            "reset": reset_time.isoformat()
        }

        return is_allowed, limit_info

    def _cleanup_idle_buckets(self, ip: str):
        """清理空闲的令牌桶（当 IP 超过 100 个时触发）"""
        if len(self.buckets) <= 100:
            return

        # 清理空记录或超过 5 分钟未活动的 IP
        now = time.time()
        keys_to_remove = []
        for ip_key, buckets in self.buckets.items():
            # 检查所有桶是否都满（表示长时间未使用）
            all_full = all(b.tokens >= b.capacity for b in buckets.values())
            # 或者检查最后更新时间是否超过 5 分钟
            all_old = all(now - b.last_update > 300 for b in buckets.values())

            if all_full or all_old:
                keys_to_remove.append(ip_key)

        # 删除空闲记录
        for k in keys_to_remove[:50]:
            del self.buckets[k]


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
        # 认证类：PIN 验证、PIN 设置
        if "/pin/" in path or "/auth/" in path:
            return "auth"
        # 敏感操作：数据备份、导入、删除
        if "/backup/" in path or "/import" in path or "/delete" in path:
            return "sensitive"
        # AI 洞察生成：限制频率
        if "/insights/generate" in path:
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

        # 处理请求
        try:
            response = await call_next(request)
            status_code = response.status_code

            # 计算处理时间
            process_time = (datetime.now() - start_time).total_seconds() * 1000

            # 添加处理时间到响应头
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

            return response

        except Exception as e:
            process_time = (datetime.now() - start_time).total_seconds() * 1000
            print(f"[MIDDLEWARE ERROR] {type(e).__name__}: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            raise
