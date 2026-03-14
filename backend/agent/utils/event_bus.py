"""
事件总线模块

用于 Agent 模块内部的事件通信，支持数据变更自动刷新。
"""

import asyncio
from typing import Dict, List, Callable, Any, Optional
from functools import wraps


# 预定义事件类型
class AgentEvents:
    """Agent 事件类型定义"""

    # 日记事件
    JOURNAL_CREATED = "journal:created"
    JOURNAL_UPDATED = "journal:updated"
    JOURNAL_DELETED = "journal:deleted"

    # 记忆事件
    MEMORY_CREATED = "memory:created"
    MEMORY_UPDATED = "memory:updated"
    MEMORY_DELETED = "memory:deleted"

    # 系统事件
    SYSTEM_SCORE_UPDATED = "system:score_updated"
    SYSTEM_ACTION_ADDED = "system:action_added"
    SYSTEM_ACTION_COMPLETED = "system:action_completed"

    # 洞察事件
    INSIGHT_GENERATED = "insight:generated"

    # 会话事件
    SESSION_CREATED = "session:created"
    SESSION_SWITCHED = "session:switched"
    SESSION_DELETED = "session:deleted"

    # 通用事件
    DATA_REFRESH = "data:refresh"
    STATE_CHANGED = "state:changed"


class EventBus:
    """
    事件总线

    支持异步事件处理和多订阅者
    """

    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    @property
    def loop(self) -> asyncio.AbstractEventLoop:
        """获取事件循环"""
        if self._loop is None:
            self._loop = asyncio.get_event_loop()
        return self._loop

    def subscribe(self, event: str, callback: Callable) -> Callable:
        """
        订阅事件

        Args:
            event: 事件名称
            callback: 回调函数

        Returns:
            取消订阅函数
        """
        if event not in self._subscribers:
            self._subscribers[event] = []

        self._subscribers[event].append(callback)

        # 返回取消订阅函数
        def unsubscribe():
            self._subscribers[event].remove(callback)
            if not self._subscribers[event]:
                del self._subscribers[event]

        return unsubscribe

    def unsubscribe(self, event: str, callback: Callable) -> None:
        """取消订阅"""
        if event in self._subscribers:
            self._subscribers[event].remove(callback)
            if not self._subscribers[event]:
                del self._subscribers[event]

    async def emit(self, event: str, data: Any = None) -> None:
        """
        触发事件（异步）

        Args:
            event: 事件名称
            data: 事件数据
        """
        if event not in self._subscribers:
            return

        # 异步执行所有回调
        for callback in self._subscribers[event]:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(data)
                else:
                    callback(data)
            except Exception as e:
                print(f"Event callback error for '{event}': {e}")

    def emit_sync(self, event: str, data: Any = None) -> None:
        """
        触发事件（同步）

        Args:
            event: 事件名称
            data: 事件数据
        """
        if event not in self._subscribers:
            return

        for callback in self._subscribers[event]:
            try:
                callback(data)
            except Exception as e:
                print(f"Event callback error for '{event}': {e}")

    def clear(self) -> None:
        """清空所有事件"""
        self._subscribers.clear()

    def get_subscriber_count(self, event: str) -> int:
        """获取事件订阅数"""
        return len(self._subscribers.get(event, []))

    def event(self, event: str):
        """
        事件装饰器

        使用方式:
        @bus.event(AgentEvents.JOURNAL_CREATED)
        async def on_journal_created(data):
            pass
        """
        def decorator(func: Callable) -> Callable:
            self.subscribe(event, func)
            return func
        return decorator


# 全局事件总线单例
_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """获取全局事件总线实例"""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus


def reset_event_bus() -> None:
    """重置事件总线（用于测试）"""
    global _event_bus
    _event_bus = None
