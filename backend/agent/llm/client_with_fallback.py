"""
带故障转移的 LLM 客户端

当主提供商不可用时，自动切换到备用提供商。
"""

import time
from typing import List, Dict, Any, Optional, AsyncIterator
from dataclasses import dataclass
from .base import (
    LLMClient,
    LLMMessage,
    LLMToolDefinition,
    LLMResponse,
    RateLimitError,
    TimeoutError,
    ServerError,
    AuthenticationError,
)


@dataclass
class ProviderConfig:
    """提供商配置"""

    name: str
    priority: int
    api_key: str
    base_url: str
    model: str
    fallback: Optional[str] = None  # 备用提供商名称


@dataclass
class CircuitState:
    """熔断器状态"""

    status: str = "closed"  # closed, open, half_open
    failure_count: int = 0
    success_count: int = 0
    last_failure: float = 0.0


class CircuitBreaker:
    """熔断器"""

    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        timeout: int = 60,
    ):
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout
        self.states: Dict[str, CircuitState] = {}

    def is_open(self, provider_name: str) -> bool:
        """检查熔断器是否打开"""
        state = self.states.get(provider_name)
        if not state:
            return False

        if state.status == "open":
            # 检查是否超时，可进入半开状态
            if time.time() - state.last_failure > self.timeout:
                state.status = "half_open"
                return False
            return True

        return False

    def record_failure(self, provider_name: str):
        """记录失败"""
        state = self.states.setdefault(provider_name, CircuitState())
        state.failure_count += 1
        state.last_failure = time.time()

        if state.failure_count >= self.failure_threshold:
            state.status = "open"

    def record_success(self, provider_name: str):
        """记录成功"""
        state = self.states.get(provider_name)
        if not state:
            return

        if state.status == "half_open":
            state.success_count += 1
            if state.success_count >= self.success_threshold:
                state.status = "closed"
                state.failure_count = 0
                state.success_count = 0


class LLMClientWithFallback:
    """带故障转移的 LLM 客户端"""

    def __init__(self, clients: List[LLMClient]):
        """
        初始化

        Args:
            clients: LLM 客户端列表（按优先级排序）
        """
        self.clients = clients
        self.circuit_breaker = CircuitBreaker()

    async def chat(
        self,
        messages: List[LLMMessage],
        tools: Optional[List[LLMToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        """
        发送聊天请求，自动故障转移

        Args:
            messages: 消息列表
            tools: Tool 定义列表
            temperature: 温度参数
            max_tokens: 最大 token 数

        Returns:
            LLMResponse: LLM 响应

        Raises:
            LLMError: 所有提供商都失败时抛出
        """
        last_error = None

        for client in self.clients:
            provider_name = client.provider_type.value

            # 检查熔断器状态
            if self.circuit_breaker.is_open(provider_name):
                continue

            try:
                result = await client.chat(
                    messages=messages,
                    tools=tools,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                self.circuit_breaker.record_success(provider_name)
                return result

            except (RateLimitError, ServerError) as exc:
                self.circuit_breaker.record_failure(provider_name)
                last_error = exc
                continue

            except AuthenticationError as exc:
                # 认证错误不切换，直接记录
                self.circuit_breaker.record_failure(provider_name)
                last_error = exc
                break

            except Exception as exc:
                # 其他错误（包括超时）
                self.circuit_breaker.record_failure(provider_name)
                last_error = exc
                continue

        # 所有提供商都失败
        from .base import LLMError

        raise LLMError(f"所有 LLM 提供商都失败，最后错误：{last_error}")

    async def stream_chat(
        self,
        messages: List[LLMMessage],
        tools: Optional[List[LLMToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> AsyncIterator[str]:
        """
        流式聊天，自动故障转移

        Yields:
            str: 响应文本片段
        """
        last_error = None

        for client in self.clients:
            provider_name = client.provider_type.value

            if self.circuit_breaker.is_open(provider_name):
                continue

            try:
                async for chunk in client.stream_chat(
                    messages=messages,
                    tools=tools,
                    temperature=temperature,
                    max_tokens=max_tokens,
                ):
                    yield chunk
                return

            except (RateLimitError, ServerError) as exc:
                self.circuit_breaker.record_failure(provider_name)
                last_error = exc
                continue

            except Exception as exc:
                # 其他错误（包括超时、认证错误）
                self.circuit_breaker.record_failure(provider_name)
                last_error = exc
                continue

        from .base import LLMError

        raise LLMError(f"所有 LLM 提供商都失败，最后错误：{last_error}")

    def get_token_count(self, text: str) -> int:
        """使用第一个客户端计算 token 数"""
        return self.clients[0].get_token_count(text)

    def supports_function_calling(self) -> bool:
        """检查是否有客户端支持 Function Calling"""
        return any(client.supports_function_calling() for client in self.clients)
