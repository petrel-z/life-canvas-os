"""
记忆系统 Skills

实现长期记忆的存储、查询、总结和遗忘功能。
"""

import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .base import BaseSkill, SkillResult, SkillParameter, RiskLevel
from backend.db.session import get_db_context
from backend.models.user import User

# 记忆类型枚举
MEMORY_TYPES = ["event", "pattern", "preference", "goal", "achievement", "lesson"]

# 记忆关联系统
MEMORY_SYSTEMS = ["FUEL", "PHYSICAL", "INTELLECTUAL", "OUTPUT", "DREAM", "ASSET", "CONNECTION", "ENVIRONMENT"]


class MemoryRecord:
    """记忆记录（简单 ORM 替代）"""

    def __init__(self, id: int, user_id: int, memory_type: str, content: str,
                 importance: float, related_system: Optional[str] = None,
                 tags: Optional[List[str]] = None, metadata: Optional[Dict] = None,
                 created_at: Optional[datetime] = None):
        self.id = id
        self.user_id = user_id
        self.memory_type = memory_type
        self.content = content
        self.importance = importance
        self.related_system = related_system
        self.tags = tags or []
        self.metadata = metadata or {}
        self.created_at = created_at or datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "memory_type": self.memory_type,
            "content": self.content,
            "importance": self.importance,
            "related_system": self.related_system,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# 简单内存存储（用于演示，实际应使用数据库）
_memory_store: Dict[int, List[MemoryRecord]] = {}


class CreateMemorySkill(BaseSkill):
    """创建记忆 Skill - 记录重要事件或模式"""

    name = "create_memory"
    description = "记录重要事件、模式或偏好到长期记忆中，用于未来的个性化服务"
    trigger_words = ["记住", "记录下来", "别忘了", "记一下", "添加到记忆"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="content",
            type="string",
            description="记忆内容",
            required=True,
        ),
        SkillParameter(
            name="memory_type",
            type="string",
            description=f"记忆类型：{', '.join(MEMORY_TYPES)}",
            required=False,
            default="event",
            enum=MEMORY_TYPES,
        ),
        SkillParameter(
            name="related_system",
            type="string",
            description=f"关联的八维系统：{', '.join(MEMORY_SYSTEMS)}",
            required=False,
            enum=MEMORY_SYSTEMS,
        ),
        SkillParameter(
            name="importance",
            type="number",
            description="重要程度 0.0-1.0，越高越容易被回忆",
            required=False,
            default=0.5,
        ),
        SkillParameter(
            name="tags",
            type="array",
            description="标签列表，如 ['工作', '成就']",
            required=False,
        ),
    ]

    async def execute(
        self,
        content: str,
        memory_type: str = "event",
        related_system: Optional[str] = None,
        importance: float = 0.5,
        tags: Optional[List[str]] = None,
    ) -> SkillResult:
        """执行创建记忆"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                # 初始化用户记忆存储
                if user.id not in _memory_store:
                    _memory_store[user.id] = []

                # 创建记忆
                memory_id = len(_memory_store[user.id]) + 1
                memory = MemoryRecord(
                    id=memory_id,
                    user_id=user.id,
                    memory_type=memory_type,
                    content=content,
                    importance=importance,
                    related_system=related_system,
                    tags=tags or [],
                )

                _memory_store[user.id].append(memory)

                # 构建回复
                type_text = {
                    "event": "事件",
                    "pattern": "模式",
                    "preference": "偏好",
                    "goal": "目标",
                    "achievement": "成就",
                    "lesson": "经验教训",
                }.get(memory_type, memory_type)

                system_text = f"（关联{related_system}系统）" if related_system else ""

                return SkillResult.ok(
                    response=f"已记住：{content}{system_text}",
                    data=memory.to_dict(),
                )

        except Exception as e:
            return SkillResult.fail(f"记录失败：{str(e)}")


class QueryMemoriesSkill(BaseSkill):
    """查询记忆 Skill"""

    name = "query_memories"
    description = "查询用户的记忆记录，支持按类型、系统、标签筛选"
    trigger_words = ["我的记忆", "记住过什么", "查看记忆", "记忆列表", "回忆一下"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="memory_type",
            type="string",
            description=f"按类型筛选：{', '.join(MEMORY_TYPES)}",
            required=False,
            enum=MEMORY_TYPES,
        ),
        SkillParameter(
            name="related_system",
            type="string",
            description="按关联系统筛选",
            required=False,
            enum=MEMORY_SYSTEMS,
        ),
        SkillParameter(
            name="tag",
            type="string",
            description="按标签筛选",
            required=False,
        ),
        SkillParameter(
            name="limit",
            type="integer",
            description="返回数量限制",
            required=False,
            default=10,
        ),
    ]

    async def execute(
        self,
        memory_type: Optional[str] = None,
        related_system: Optional[str] = None,
        tag: Optional[str] = None,
        limit: int = 10,
    ) -> SkillResult:
        """执行查询记忆"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                memories = _memory_store.get(user.id, [])

                # 筛选
                if memory_type:
                    memories = [m for m in memories if m.memory_type == memory_type]
                if related_system:
                    memories = [m for m in memories if m.related_system == related_system]
                if tag:
                    memories = [m for m in memories if tag in m.tags]

                # 按重要度排序
                memories = sorted(memories, key=lambda m: m.importance, reverse=True)

                # 限制数量
                memories = memories[:limit]

                if not memories:
                    return SkillResult.ok("暂无记忆记录", data={"memories": []})

                memory_list = [m.to_dict() for m in memories]

                return SkillResult.ok(
                    response=f"找到 {len(memory_list)} 条记忆",
                    data={"memories": memory_list},
                )

        except Exception as e:
            return SkillResult.fail(f"查询失败：{str(e)}")


class SummarizeMemoriesSkill(BaseSkill):
    """总结记忆 Skill - 生成记忆摘要"""

    name = "summarize_memories"
    description = "总结用户的记忆，生成洞察和模式识别"
    trigger_words = ["总结记忆", "记忆分析", "我的模式", "记忆洞察", "分析一下记忆"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="related_system",
            type="string",
            description="按系统总结",
            required=False,
            enum=MEMORY_SYSTEMS,
        ),
        SkillParameter(
            name="days",
            type="integer",
            description="总结最近 N 天的记忆",
            required=False,
            default=30,
        ),
    ]

    async def execute(
        self,
        related_system: Optional[str] = None,
        days: int = 30,
    ) -> SkillResult:
        """执行总结记忆"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                memories = _memory_store.get(user.id, [])

                # 时间筛选
                cutoff_date = datetime.now() - timedelta(days=days)
                memories = [m for m in memories if m.created_at >= cutoff_date]

                # 系统筛选
                if related_system:
                    memories = [m for m in memories if m.related_system == related_system]

                if not memories:
                    return SkillResult.ok(f"最近{days}天暂无记忆记录", data={"summary": None})

                # 生成统计
                type_counts = {}
                system_counts = {}
                for m in memories:
                    type_counts[m.memory_type] = type_counts.get(m.memory_type, 0) + 1
                    if m.related_system:
                        system_counts[m.related_system] = system_counts.get(m.related_system, 0) + 1

                # 找出最重要的记忆
                top_memories = sorted(memories, key=lambda m: m.importance, reverse=True)[:3]

                summary = {
                    "total_count": len(memories),
                    "date_range": f"最近{days}天",
                    "by_type": type_counts,
                    "by_system": system_counts,
                    "top_memories": [m.to_dict() for m in top_memories],
                    "insights": [],
                }

                # 生成洞察
                if type_counts.get("pattern"):
                    summary["insights"].append(f"您记录了{type_counts['pattern']}个模式，说明您善于自我观察")
                if type_counts.get("goal"):
                    summary["insights"].append(f"您有{type_counts['goal']}个目标，保持专注并定期回顾")
                if type_counts.get("achievement"):
                    summary["insights"].append(f"恭喜！您记录了{type_counts['achievement']}个成就，继续保持")

                # 系统分布洞察
                if system_counts:
                    top_system = max(system_counts.items(), key=lambda x: x[1])
                    system_names = {
                        "FUEL": "饮食",
                        "PHYSICAL": "运动",
                        "INTELLECTUAL": "学习",
                        "OUTPUT": "工作",
                        "DREAM": "梦想",
                        "ASSET": "财务",
                        "CONNECTION": "社交",
                        "ENVIRONMENT": "环境",
                    }
                    summary["insights"].append(f"您在{system_names.get(top_system[0], top_system[0])}系统方面最活跃")

                # 构建回复
                insights_text = "\n".join([f"- {i}" for i in summary["insights"]])

                return SkillResult.ok(
                    response=f"记忆总结（{summary['total_count']}条）：\n{insights_text}",
                    data=summary,
                )

        except Exception as e:
            return SkillResult.fail(f"总结失败：{str(e)}")


class ForgetMemorySkill(BaseSkill):
    """遗忘记忆 Skill - 删除指定记忆"""

    name = "forget_memory"
    description = "删除指定的记忆记录（高风险操作，需要确认）"
    trigger_words = ["忘记", "删掉记忆", "删除记忆", "移除记忆", "不再记得"]
    risk_level = RiskLevel.HIGH

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="memory_id",
            type="integer",
            description="要删除的记忆 ID",
            required=True,
        ),
    ]

    async def execute(
        self,
        memory_id: int,
    ) -> SkillResult:
        """执行遗忘记忆"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                memories = _memory_store.get(user.id, [])
                memory = next((m for m in memories if m.id == memory_id), None)

                if not memory:
                    return SkillResult.fail(f"未找到 ID 为{memory_id}的记忆")

                # 返回需要确认的信息
                return SkillResult.ok(
                    response=f"确认删除记忆：{memory.content[:50]}{'...' if len(memory.content) > 50 else ''}？此操作不可撤销。",
                    data={"id": memory_id, "content": memory.content},
                    requires_confirmation=True,
                    confirmation_id=f"delete_memory_{memory_id}",
                    confirmation_message=f"确认删除记忆：{memory.content[:50]}{'...' if len(memory.content) > 50 else ''}？",
                )

        except Exception as e:
            return SkillResult.fail(f"删除失败：{str(e)}")


# 导出所有 Skills
__all__ = [
    "CreateMemorySkill",
    "QueryMemoriesSkill",
    "SummarizeMemoriesSkill",
    "ForgetMemorySkill",
]
