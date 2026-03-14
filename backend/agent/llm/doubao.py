"""
豆包（火山引擎）LLM 客户端实现
"""

import json
import aiohttp
import asyncio
from typing import List, Dict, Any, Optional, AsyncIterator

from .base import (
    LLMClient,
    LLMMessage,
    LLMToolDefinition,
    LLMResponse,
    LLMProviderType,
    RateLimitError,
    TimeoutError,
    AuthenticationError,
    ServerError,
)


class DoubaoClient(LLMClient):
    """豆包 LLM 客户端"""

    provider_type = LLMProviderType.DOUBAO

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://ark.cn-beijing.volces.com/api/v3",
        model: str = "doubao-seed",
        timeout: int = 30,
        verify_ssl: bool = True,
    ):
        super().__init__(api_key, base_url, model, timeout)
        self.verify_ssl = verify_ssl

    async def chat(
        self,
        messages: List[LLMMessage],
        tools: Optional[List[LLMToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        """发送聊天请求"""
        url = f"{self.base_url}/chat/completions"

        headers = self._build_headers()

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if tools:
            payload["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    },
                }
                for t in tools
            ]
            payload["tool_choice"] = "auto"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url, headers=headers, json=payload, timeout=self.timeout,
                    ssl=False,
                ) as response:
                    if response.status == 401:
                        raise AuthenticationError("API Key 无效")
                    elif response.status == 429:
                        raise RateLimitError("请求频率超限")
                    elif response.status >= 500:
                        raise ServerError(f"服务端错误：{response.status}")
                    elif response.status != 200:
                        raise TimeoutError(f"请求失败：{response.status}")

                    data = await response.json()

                    choice = data["choices"][0]
                    content = choice["message"].get("content", "")
                    tool_calls = choice["message"].get("tool_calls", [])

                    return LLMResponse(
                        content=content,
                        tool_calls=tool_calls,
                        usage=data.get("usage", {}),
                        model=data.get("model", self.model),
                        finish_reason=choice.get("finish_reason", ""),
                    )

        except asyncio.TimeoutError:
            raise TimeoutError("请求超时")
        except aiohttp.ClientError as e:
            raise ServerError(f"网络错误：{e}")

    async def stream_chat(
        self,
        messages: List[LLMMessage],
        tools: Optional[List[LLMToolDefinition]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> AsyncIterator[str]:
        """流式聊天"""
        url = f"{self.base_url}/chat/completions"

        headers = self._build_headers()

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        if tools:
            payload["tools"] = [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    },
                }
                for t in tools
            ]

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url, headers=headers, json=payload, timeout=self.timeout,
                    ssl=False,
                ) as response:
                    if response.status != 200:
                        raise ServerError(f"请求失败：{response.status}")

                    async for line in response.content:
                        line = line.decode("utf-8").strip()
                        if line.startswith("data: "):
                            line = line[6:]
                            if line == "[DONE]":
                                break
                            try:
                                data = json.loads(line)
                                if data["choices"]:
                                    content = data["choices"][0]["delta"].get(
                                        "content", ""
                                    )
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue

        except asyncio.TimeoutError:
            raise TimeoutError("请求超时")

    def get_token_count(self, text: str) -> int:
        """估算 token 数（中文约 1.5 字/token）"""
        return max(1, int(len(text) / 1.5))

    def supports_function_calling(self) -> bool:
        """豆包支持 Function Calling"""
        return True
