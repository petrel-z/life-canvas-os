"""
八维系统 Skills

实现八个生命维度系统的查询、更新、行动项管理等功能。
八个系统：FUEL(饮食)、PHYSICAL(运动)、INTELLECTUAL(学习)、OUTPUT(工作)、
         DREAM(梦想)、ASSET(财务)、CONNECTION(社交)、ENVIRONMENT(环境)
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .base import BaseSkill, SkillResult, SkillParameter, RiskLevel
from backend.db.session import get_db_context
from backend.models.user import User
from backend.models.dimension import (
    System,
    SystemLog,
    SystemAction,
    SYSTEM_TYPES,
    DEFAULT_SYSTEM_DETAILS,
)


class GetSystemScoreSkill(BaseSkill):
    """获取系统评分 Skill"""

    name = "get_system_score"
    description = "获取指定八维系统的当前评分和详情"
    trigger_words = ["评分", "得分", "多少分", "系统评分", "我的"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="dimension",
            type="string",
            description=f"八维系统：{', '.join(SYSTEM_TYPES)}",
            required=False,  # 不必填，不填则返回所有系统
            enum=SYSTEM_TYPES,
        ),
    ]

    async def execute(
        self,
        dimension: Optional[str] = None,
    ) -> SkillResult:
        """执行获取系统评分"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                # 查询系统
                query = db.query(System).filter(System.user_id == user.id)
                if dimension:
                    query = query.filter(System.type == dimension)

                systems = query.all()

                if not systems:
                    # 初始化系统
                    systems = []
                    types_to_init = [dimension] if dimension else SYSTEM_TYPES
                    for sys_type in types_to_init:
                        details = DEFAULT_SYSTEM_DETAILS.get(sys_type, {})
                        system = System(
                            user_id=user.id,
                            type=sys_type,
                            score=50,
                            details=details,
                        )
                        db.add(system)
                        db.commit()
                        db.refresh(system)
                        systems.append(system)

                result_data = []
                for s in systems:
                    result_data.append({
                        "type": s.type,
                        "score": s.score,
                        "details": s.details,
                        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
                    })

                if dimension:
                    s = systems[0]
                    type_names = {
                        "FUEL": "饮食",
                        "PHYSICAL": "运动",
                        "INTELLECTUAL": "学习",
                        "OUTPUT": "工作",
                        "DREAM": "梦想",
                        "ASSET": "财务",
                        "CONNECTION": "社交",
                        "ENVIRONMENT": "环境",
                    }
                    return SkillResult.ok(
                        response=f"您的{type_names.get(dimension, dimension)}系统当前评分为{s.score}分",
                        data=result_data[0],
                    )
                else:
                    return SkillResult.ok(
                        response=f"找到{len(result_data)}个系统评分",
                        data={"systems": result_data},
                    )

        except Exception as e:
            return SkillResult.fail(f"查询失败：{str(e)}")


class UpdateSystemScoreSkill(BaseSkill):
    """更新系统评分 Skill"""

    name = "update_system_score"
    description = "手动更新八维系统的评分（用于复盘调整）"
    trigger_words = ["更新评分", "修改评分", "调整评分", "重新评分"]
    risk_level = RiskLevel.MEDIUM

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="dimension",
            type="string",
            description=f"八维系统：{', '.join(SYSTEM_TYPES)}",
            required=True,
            enum=SYSTEM_TYPES,
        ),
        SkillParameter(
            name="score",
            type="integer",
            description="新评分 0-100",
            required=True,
        ),
        SkillParameter(
            name="reason",
            type="string",
            description="评分变化原因",
            required=False,
        ),
    ]

    async def execute(
        self,
        dimension: str,
        score: int,
        reason: Optional[str] = None,
    ) -> SkillResult:
        """执行更新系统评分"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                if score < 0 or score > 100:
                    return SkillResult.fail("评分必须在 0-100 之间")

                system = db.query(System).filter(
                    System.type == dimension,
                    System.user_id == user.id,
                ).first()

                if not system:
                    # 创建系统
                    details = DEFAULT_SYSTEM_DETAILS.get(dimension, {})
                    system = System(
                        user_id=user.id,
                        type=dimension,
                        score=score,
                        details=details,
                    )
                    db.add(system)
                else:
                    old_score = system.score
                    system.score = score

                    # 记录评分变化日志
                    score_log = SystemScoreLog(
                        system_id=system.id,
                        old_score=old_score,
                        new_score=score,
                        change_reason=reason or "手动更新",
                    )
                    db.add(score_log)

                db.commit()
                db.refresh(system)

                type_names = {
                    "FUEL": "饮食",
                    "PHYSICAL": "运动",
                    "INTELLECTUAL": "学习",
                    "OUTPUT": "工作",
                    "DREAM": "梦想",
                    "ASSET": "财务",
                    "CONNECTION": "社交",
                    "ENVIRONMENT": "环境",
                }

                change_text = ""
                if reason:
                    change_text = f"（原因：{reason}）"

                return SkillResult.ok(
                    response=f"已将{type_names.get(dimension, dimension)}系统评分更新为{score}分{change_text}",
                    data={
                        "dimension": dimension,
                        "score": score,
                        "updated_at": system.updated_at.isoformat() if system.updated_at else None,
                    },
                )

        except Exception as e:
            return SkillResult.fail(f"更新失败：{str(e)}")


class AddSystemLogSkill(BaseSkill):
    """添加系统日志 Skill"""

    name = "add_system_log"
    description = "向指定八维系统添加日志记录（如饮食记录、运动时长等）"
    trigger_words = ["记录", "添加", "写下", "记下", "打卡"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="dimension",
            type="string",
            description=f"八维系统：{', '.join(SYSTEM_TYPES)}",
            required=True,
            enum=SYSTEM_TYPES,
        ),
        SkillParameter(
            name="label",
            type="string",
            description="日志标签，如'早餐'、'运动'、'读书'",
            required=True,
        ),
        SkillParameter(
            name="value",
            type="string",
            description="日志内容",
            required=True,
        ),
        SkillParameter(
            name="meta_data",
            type="object",
            description="额外元数据（JSON 格式）",
            required=False,
        ),
    ]

    async def execute(
        self,
        dimension: str,
        label: str,
        value: str,
        meta_data: Optional[Dict] = None,
    ) -> SkillResult:
        """执行添加系统日志"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                system = db.query(System).filter(
                    System.type == dimension,
                    System.user_id == user.id,
                ).first()

                if not system:
                    # 创建系统
                    details = DEFAULT_SYSTEM_DETAILS.get(dimension, {})
                    system = System(
                        user_id=user.id,
                        type=dimension,
                        score=50,
                        details=details,
                    )
                    db.add(system)
                    db.commit()
                    db.refresh(system)

                # 添加日志
                log = SystemLog(
                    system_id=system.id,
                    label=label,
                    value=value,
                    meta_data=meta_data,
                )
                db.add(log)
                db.commit()

                return SkillResult.ok(
                    response=f"已记录{label}: {value}",
                    data={
                        "id": log.id,
                        "dimension": dimension,
                        "label": label,
                        "value": value,
                        "created_at": log.created_at.isoformat() if log.created_at else None,
                    },
                )

        except Exception as e:
            return SkillResult.fail(f"记录失败：{str(e)}")


class AddSystemActionSkill(BaseSkill):
    """添加系统行动项 Skill"""

    name = "add_system_action"
    description = "向指定八维系统添加行动项（待办事项）"
    trigger_words = ["添加待办", "创建行动", "计划", "待办事项", "要做"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="dimension",
            type="string",
            description=f"八维系统：{', '.join(SYSTEM_TYPES)}",
            required=True,
            enum=SYSTEM_TYPES,
        ),
        SkillParameter(
            name="text",
            type="string",
            description="行动项内容",
            required=True,
        ),
    ]

    async def execute(
        self,
        dimension: str,
        text: str,
    ) -> SkillResult:
        """执行添加系统行动项"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                system = db.query(System).filter(
                    System.type == dimension,
                    System.user_id == user.id,
                ).first()

                if not system:
                    # 创建系统
                    details = DEFAULT_SYSTEM_DETAILS.get(dimension, {})
                    system = System(
                        user_id=user.id,
                        type=dimension,
                        score=50,
                        details=details,
                    )
                    db.add(system)
                    db.commit()
                    db.refresh(system)

                # 添加行动项
                action = SystemAction(
                    system_id=system.id,
                    text=text,
                    completed=0,
                )
                db.add(action)
                db.commit()

                type_names = {
                    "FUEL": "饮食",
                    "PHYSICAL": "运动",
                    "INTELLECTUAL": "学习",
                    "OUTPUT": "工作",
                    "DREAM": "梦想",
                    "ASSET": "财务",
                    "CONNECTION": "社交",
                    "ENVIRONMENT": "环境",
                }

                return SkillResult.ok(
                    response=f"已在{type_names.get(dimension, dimension)}系统中添加待办：{text}",
                    data={
                        "id": action.id,
                        "text": text,
                        "completed": False,
                    },
                )

        except Exception as e:
            return SkillResult.fail(f"添加失败：{str(e)}")


class CompleteSystemActionSkill(BaseSkill):
    """完成系统行动项 Skill"""

    name = "complete_system_action"
    description = "标记指定行动项为已完成"
    trigger_words = ["完成待办", "完成行动", "打勾", "已完成", "做完"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="action_id",
            type="integer",
            description="行动项 ID",
            required=True,
        ),
    ]

    async def execute(
        self,
        action_id: int,
    ) -> SkillResult:
        """执行完成系统行动项"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                action = db.query(SystemAction).filter(
                    SystemAction.id == action_id,
                ).first()

                if not action:
                    return SkillResult.fail(f"未找到 ID 为{action_id}的行动项")

                action.completed = 1
                db.commit()

                return SkillResult.ok(
                    response=f"已标记行动项为已完成：{action.text}",
                    data={
                        "id": action.id,
                        "text": action.text,
                        "completed": True,
                    },
                )

        except Exception as e:
            return SkillResult.fail(f"更新失败：{str(e)}")


class ListSystemActionsSkill(BaseSkill):
    """列出系统行动项 Skill"""

    name = "list_system_actions"
    description = "列出指定八维系统的行动项（待办事项）"
    trigger_words = ["我的待办", "行动列表", "待办事项", "还有什么要做的"]
    risk_level = RiskLevel.LOW

    parameters: List[SkillParameter] = [
        SkillParameter(
            name="dimension",
            type="string",
            description=f"八维系统：{', '.join(SYSTEM_TYPES)}",
            required=False,
            enum=SYSTEM_TYPES,
        ),
        SkillParameter(
            name="completed",
            type="boolean",
            description="是否只显示已完成的",
            required=False,
            default=False,
        ),
    ]

    async def execute(
        self,
        dimension: Optional[str] = None,
        completed: bool = False,
    ) -> SkillResult:
        """执行列出系统行动项"""
        try:
            with get_db_context() as db:
                user = db.query(User).first()
                if not user:
                    return SkillResult.fail("用户不存在")

                # 查询系统
                query = db.query(System).filter(System.user_id == user.id)
                if dimension:
                    query = query.filter(System.type == dimension)
                systems = query.all()

                system_ids = [s.id for s in systems]
                if not system_ids:
                    return SkillResult.ok("暂无行动项记录", data={"actions": []})

                # 查询行动项
                action_query = db.query(SystemAction).filter(
                    SystemAction.system_id.in_(system_ids)
                )
                action_query = action_query.order_by(desc(SystemAction.created_at))

                if not completed:
                    action_query = action_query.filter(SystemAction.completed == 0)

                actions = action_query.all()

                action_list = []
                for a in actions:
                    # 获取所属系统
                    system = db.query(System).filter(System.id == a.system_id).first()
                    action_list.append({
                        "id": a.id,
                        "dimension": system.type if system else "Unknown",
                        "text": a.text,
                        "completed": bool(a.completed),
                        "created_at": a.created_at.isoformat() if a.created_at else None,
                    })

                return SkillResult.ok(
                    response=f"找到{len(action_list)}个行动项",
                    data={"actions": action_list},
                )

        except Exception as e:
            return SkillResult.fail(f"查询失败：{str(e)}")


# 导入 SystemScoreLog 以避免循环依赖
from backend.models.dimension import SystemScoreLog

# 导出所有 Skills
__all__ = [
    "GetSystemScoreSkill",
    "UpdateSystemScoreSkill",
    "AddSystemLogSkill",
    "AddSystemActionSkill",
    "CompleteSystemActionSkill",
    "ListSystemActionsSkill",
]
