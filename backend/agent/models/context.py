"""
上下文模型
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime


@dataclass
class ContextState:
    """上下文状态"""

    session_id: str
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: Optional[datetime] = None  # 最后访问时间
    messages: List[Dict[str, Any]] = field(default_factory=list)
    last_operations: List[Dict[str, Any]] = field(default_factory=list)
    references: Dict[str, Any] = field(default_factory=dict)  # 改名为 references
    token_count: int = 0

    def __post_init__(self):
        """初始化后设置 last_accessed"""
        if self.last_accessed is None:
            self.last_accessed = datetime.now()

    def add_message(self, role: str, content: str) -> None:
        """添加消息"""
        self.messages.append(
            {
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat(),
            }
        )
        self.last_accessed = datetime.now()

    def add_operation(self, skill: str, result: Dict[str, Any]) -> None:
        """添加操作记录"""
        self.last_operations.append(
            {"skill": skill, "result": result, "timestamp": datetime.now().isoformat()}
        )
        # 保留最近 10 条操作
        if len(self.last_operations) > 10:
            self.last_operations = self.last_operations[-10:]
        self.last_accessed = datetime.now()

    def set_reference(self, key: str, value: Any) -> None:
        """设置实体引用"""
        self.references[key] = value
        self.last_accessed = datetime.now()

    def get_reference(self, key: str, default: Any = None) -> Any:
        """获取实体引用"""
        return self.references.get(key, default)

    def clear(self) -> None:
        """清空上下文"""
        self.messages.clear()
        self.last_operations.clear()
        self.references.clear()
        self.token_count = 0
