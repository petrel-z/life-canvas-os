"""
日记相关 Skills

实现日记的创建、查询、更新、删除等操作。
"""

import asyncio
from typing import Optional, List
from sqlalchemy.orm import Session

from .base import BaseSkill, SkillResult, SkillParameter, RiskLevel
from backend.db.session import get_db_context
from backend.models.diary import Diary, MOOD_TYPES
from backend.models.user import User
from backend.schemas.journal import DiaryCreate, DiaryUpdate

# 导入事件总线
from backend.agent.utils.event_bus import get_event_bus, AgentEvents


class CreateJournalSkill(BaseSkill):
    """创建日记 Skill"""

    name = "create_journal"
    description = "创建一篇新的日记，记录用户的心情、事件和感悟"
    trigger_words = ["写日记", "创建日记", "记一下", "记录", "新增日记"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="title",
            type="string",
            description="日记标题",
            required=True,
        ),
        SkillParameter(
            name="content",
            type="string",
            description="日记内容",
            required=True,
        ),
        SkillParameter(
            name="mood",
            type="string",
            description="心情状态：great（很好）, good（好）, neutral（一般）, bad（坏）, terrible（很差）",
            required=False,
            enum=MOOD_TYPES,
        ),
        SkillParameter(
            name="tags",
            type="array",
            description="标签列表，如 ['工作', '生活']",
            required=False,
        ),
        SkillParameter(
            name="related_system",
            type="string",
            description="关联的生命系统：FUEL, PHYSICAL, INTELLECTUAL, OUTPUT, DREAM, ASSET, CONNECTION, ENVIRONMENT",
            required=False,
        ),
        SkillParameter(
            name="is_private",
            type="boolean",
            description="是否设为私密日记",
            required=False,
            default=False,
        ),
    ]

    async def execute(
        self,
        title: str,
        content: str,
        mood: Optional[str] = None,
        tags: Optional[List[str]] = None,
        related_system: Optional[str] = None,
        is_private: bool = False,
    ) -> SkillResult:
        """执行创建日记"""
        try:
            with get_db_context() as db:
                # 获取用户
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                # 创建日记
                diary = Diary(
                    user_id=user.id,
                    title=title,
                    content=content,
                    mood=mood,
                    tags=tags,
                    related_system=related_system,
                    is_private=1 if is_private else 0,
                )

                db.add(diary)
                db.commit()
                db.refresh(diary)

                # 触发事件
                event_bus = get_event_bus()
                asyncio.create_task(event_bus.emit(
                    AgentEvents.JOURNAL_CREATED,
                    {"id": diary.id, "title": diary.title, "mood": diary.mood}
                ))

                mood_text = f"心情：{mood}" if mood else ""
                tags_text = f"，标签：{', '.join(tags)}" if tags else ""

                return SkillResult.ok(
                    response=f"已为您创建日记《{title}》！{mood_text}{tags_text}",
                    data={
                        "id": diary.id,
                        "title": diary.title,
                        "content": diary.content,
                        "mood": diary.mood,
                        "tags": diary.tags,
                        "created_at": diary.created_at.isoformat() if diary.created_at else None,
                    },
                )

        except Exception as e:
            return SkillResult.fail(f"创建失败：{str(e)}")


class QueryJournalsSkill(BaseSkill):
    """查询日记 Skill"""

    name = "query_journals"
    description = "查询用户的日记列表或日记详情"
    trigger_words = ["我的日记", "查看日记", "日记列表", "读日记", "最近日记"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="journal_id",
            type="integer",
            description="日记 ID，指定则查询单篇日记详情",
            required=False,
        ),
        SkillParameter(
            name="mood",
            type="string",
            description="按心情筛选：great, good, neutral, bad, terrible",
            required=False,
            enum=MOOD_TYPES,
        ),
        SkillParameter(
            name="related_system",
            type="string",
            description="按关联系统筛选",
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
        journal_id: Optional[int] = None,
        mood: Optional[str] = None,
        related_system: Optional[str] = None,
        limit: int = 10,
    ) -> SkillResult:
        """执行查询日记"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                # 查询单篇
                if journal_id:
                    diary = db.query(Diary).filter(
                        Diary.id == journal_id,
                        Diary.user_id == user.id,
                    ).first()

                    if not diary:
                        return SkillResult.fail(f"未找到 ID 为 {journal_id} 的日记")

                    return SkillResult.ok(
                        response=f"日记《{diary.title}》：{diary.content[:100]}{'...' if len(diary.content) > 100 else ''}",
                        data={
                            "id": diary.id,
                            "title": diary.title,
                            "content": diary.content,
                            "mood": diary.mood,
                            "tags": diary.tags,
                            "created_at": diary.created_at.isoformat() if diary.created_at else None,
                        },
                    )

                # 查询列表
                query = db.query(Diary).filter(Diary.user_id == user.id)

                if mood:
                    query = query.filter(Diary.mood == mood)
                if related_system:
                    query = query.filter(Diary.related_system == related_system)

                diaries = query.order_by(Diary.created_at.desc()).limit(limit).all()

                if not diaries:
                    return SkillResult.ok("暂无日记记录", data={"journals": []})

                journal_list = []
                for d in diaries:
                    journal_list.append({
                        "id": d.id,
                        "title": d.title,
                        "mood": d.mood,
                        "created_at": d.created_at.isoformat() if d.created_at else None,
                    })

                return SkillResult.ok(
                    response=f"找到 {len(journal_list)} 篇日记",
                    data={"journals": journal_list},
                )

        except Exception as e:
            return SkillResult.fail(f"查询失败：{str(e)}")


class UpdateJournalSkill(BaseSkill):
    """更新日记 Skill"""

    name = "update_journal"
    description = "更新已有日记的内容、心情或标签"
    trigger_words = ["修改日记", "更新日记", "编辑日记", "改写日记"]
    risk_level = RiskLevel.MEDIUM

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="journal_id",
            type="integer",
            description="要更新的日记 ID",
            required=True,
        ),
        SkillParameter(
            name="title",
            type="string",
            description="新标题",
            required=False,
        ),
        SkillParameter(
            name="content",
            type="string",
            description="新内容",
            required=False,
        ),
        SkillParameter(
            name="mood",
            type="string",
            description="新心情状态",
            required=False,
            enum=MOOD_TYPES,
        ),
        SkillParameter(
            name="tags",
            type="array",
            description="新标签列表",
            required=False,
        ),
    ]

    async def execute(
        self,
        journal_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        mood: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> SkillResult:
        """执行更新日记"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                diary = db.query(Diary).filter(
                    Diary.id == journal_id,
                    Diary.user_id == user.id,
                ).first()

                if not diary:
                    return SkillResult.fail(f"未找到 ID 为 {journal_id} 的日记")

                # 记录变更
                changes = []

                if title is not None:
                    changes.append(f"标题：'{diary.title}' → '{title}'")
                    diary.title = title
                if content is not None:
                    changes.append("内容已更新")
                    diary.content = content
                if mood is not None:
                    changes.append(f"心情：'{diary.mood}' → '{mood}'")
                    diary.mood = mood
                if tags is not None:
                    changes.append(f"标签：{tags}")
                    diary.tags = tags

                db.commit()
                db.refresh(diary)

                changes_text = "；".join(changes) if changes else "无变化"

                return SkillResult.ok(
                    response=f"已更新日记《{diary.title}》：{changes_text}",
                    data={
                        "id": diary.id,
                        "title": diary.title,
                        "updated_at": diary.updated_at.isoformat() if diary.updated_at else None,
                    },
                    requires_confirmation=False,
                )

        except Exception as e:
            return SkillResult.fail(f"更新失败：{str(e)}")


class DeleteJournalSkill(BaseSkill):
    """删除日记 Skill"""

    name = "delete_journal"
    description = "删除指定的日记（高风险操作，需要确认）"
    trigger_words = ["删除日记", "删掉日记", "移除日记", "丢弃日记"]
    risk_level = RiskLevel.HIGH

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="journal_id",
            type="integer",
            description="要删除的日记 ID",
            required=True,
        ),
    ]

    async def execute(
        self,
        journal_id: int,
    ) -> SkillResult:
        """执行删除日记"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                diary = db.query(Diary).filter(
                    Diary.id == journal_id,
                    Diary.user_id == user.id,
                ).first()

                if not diary:
                    return SkillResult.fail(f"未找到 ID 为 {journal_id} 的日记")

                # 返回需要确认的信息
                return SkillResult.ok(
                    response=f"确认删除日记《{diary.title}》？此操作不可撤销。",
                    data={"id": diary.id, "title": diary.title},
                    requires_confirmation=True,
                    confirmation_id=f"delete_journal_{journal_id}",
                    confirmation_message=f"确认删除日记《{diary.title}》？",
                )

        except Exception as e:
            return SkillResult.fail(f"删除失败：{str(e)}")


# 导出所有 Skills
__all__ = [
    "CreateJournalSkill",
    "QueryJournalsSkill",
    "UpdateJournalSkill",
    "DeleteJournalSkill",
]
