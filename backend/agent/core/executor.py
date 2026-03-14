"""
ReAct 执行器

实现 Reason + Act 交替进行的 Agent 执行逻辑。
"""

import json
from typing import Dict, Any, Optional, List, Tuple
from ..llm.base import (
    LLMMessage,
    LLMToolDefinition,
    LLMResponse,
)
from ..llm.client_with_fallback import LLMClientWithFallback
from ..skills.base import BaseSkill, SkillResult, RiskLevel
from ..tools.base import BaseTool
from ..models.context import ContextState
from ..utils.logger import get_agent_logger
from ..utils.security import get_gatekeeper
from .prompts import PromptTemplate
from .context import ContextManager

logger = get_agent_logger()


class ReActExecutor:
    """
    ReAct 执行器

    执行 Thought-Action-Observation 循环，直到：
    - 得到最终答案
    - 需要用户确认
    - 达到最大迭代次数
    """

    # 执行器配置
    MAX_ITERATIONS = 5  # 最大迭代次数
    CONFIRMATION_REQUIRED = "confirmation_required"

    def __init__(
        self,
        llm_client: LLMClientWithFallback,
        context_manager: ContextManager,
        skills: Dict[str, BaseSkill],
        tools: Dict[str, BaseTool],
    ):
        """
        初始化执行器

        Args:
            llm_client: LLM 客户端
            context_manager: 上下文管理器
            skills: 技能字典
            tools: 工具字典
        """
        self.llm = llm_client
        self.context_manager = context_manager
        self.skills = skills
        self.tools = tools

    async def execute(
        self,
        message: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Tuple[SkillResult, bool]:
        """
        执行用户请求

        Args:
            message: 用户消息
            session_id: 会话 ID
            user_id: 用户 ID

        Returns:
            Tuple[SkillResult, bool]: (执行结果，是否需要确认)
        """
        # 安全检查
        gatekeeper = get_gatekeeper()
        security_result = gatekeeper.check(message)
        if not security_result.is_safe:
            return SkillResult.fail(f"安全检查未通过：{security_result.reason}"), False

        # 获取或创建上下文
        context = self.context_manager.get_or_create(session_id)

        # 添加用户消息到上下文
        context.add_message("user", message)

        # 构建消息历史
        messages = self._build_messages(context, message)

        # 构建 Tool 定义
        tool_definitions = self._build_tool_definitions()

        # 执行 ReAct 循环
        iteration = 0
        while iteration < self.MAX_ITERATIONS:
            iteration += 1

            try:
                # 调用 LLM
                response = await self.llm.chat(
                    messages=messages,
                    tools=tool_definitions if tool_definitions else None,
                )

                # 分析响应
                if response.has_tool_calls:
                    # 有工具调用
                    tool_results = await self._execute_tool_calls(
                        response.tool_calls, context
                    )

                    # 添加观察结果到消息
                    messages.append(
                        LLMMessage(
                            role="assistant",
                            content=response.content or "正在处理...",
                        )
                    )

                    for result in tool_results:
                        messages.append(
                            LLMMessage(
                                role="user",
                                content=f"执行结果：{json.dumps(result, ensure_ascii=False)}",
                            )
                        )

                    # 检查是否有需要确认的操作
                    for result in tool_results:
                        if result.get("requires_confirmation"):
                            return (
                                SkillResult.ok(
                                    response="需要确认",
                                    requires_confirmation=True,
                                    confirmation_id=result.get("confirmation_id"),
                                    confirmation_message=result.get(
                                        "confirmation_message"
                                    ),
                                ),
                                True,
                            )

                    # 没有确认请求，返回工具执行结果
                    # 合并所有工具的响应
                    responses = [r.get("response", "") for r in tool_results if r.get("response")]
                    final_response = "\n".join(responses) if responses else "操作已完成"

                    return SkillResult.ok(final_response), False

                else:
                    # 无工具调用，直接返回
                    final_result = SkillResult.ok(response.content or "我暂时没有更好的建议，换个话题试试吧～")

                    # 添加到上下文
                    context.add_message("assistant", response.content or "我暂时没有更好的建议，换个话题试试吧～")

                    return final_result, False

            except Exception as e:
                logger.error(f"ReAct 执行出错：{e}")
                return SkillResult.fail(f"执行出错：{str(e)}"), False

        # 达到最大迭代次数
        return SkillResult.fail("达到最大迭代次数，未能完成任务"), False

    def _build_messages(
        self, context: ContextState, user_message: str
    ) -> List[LLMMessage]:
        """构建消息列表"""
        messages = [
            LLMMessage(
                role="system",
                content=PromptTemplate.build_system_prompt(
                    tools_description=self._get_skills_description()
                ),
            )
        ]

        # 添加历史消息
        for msg in context.messages[-10:]:  # 只保留最近 10 轮
            messages.append(LLMMessage(role=msg["role"], content=msg["content"]))

        return messages

    def _build_tool_definitions(self) -> List[LLMToolDefinition]:
        """构建 Tool 定义列表"""
        definitions = []

        for skill in self.skills.values():
            definitions.append(
                LLMToolDefinition(
                    name=skill.name,
                    description=skill.description,
                    parameters=skill.get_tool_definitions()["function"]["parameters"],
                )
            )

        return definitions

    async def _execute_tool_calls(
        self, tool_calls: List[Dict[str, Any]], context: ContextState
    ) -> List[Dict[str, Any]]:
        """执行工具调用"""
        results = []

        for tool_call in tool_calls:
            function = tool_call.get("function", {})
            name = function.get("name")
            arguments = function.get("arguments", {})

            # 解析参数
            try:
                params = (
                    json.loads(arguments) if isinstance(arguments, str) else arguments
                )
            except json.JSONDecodeError:
                params = {}

            # 执行技能
            if name in self.skills:
                skill = self.skills[name]
                result = await skill.execute(**params)

                # 记录操作
                context.add_operation(name, {"params": params, "success": result.success})

                # 设置实体引用（用于上下文引用）
                if result.data and isinstance(result.data, dict):
                    if "id" in result.data:
                        context.set_reference("last_id", result.data["id"])
                    if "title" in result.data:
                        context.set_reference("last_title", result.data["title"])

                results.append(
                    {
                        "skill": name,
                        "success": result.success,
                        "response": result.response,
                        "data": result.data,
                        "requires_confirmation": result.requires_confirmation,
                        "confirmation_id": result.confirmation_id,
                        "confirmation_message": result.confirmation_message,
                    }
                )

        return results

    def _get_skills_description(self) -> str:
        """获取技能描述"""
        descriptions = []
        for skill in self.skills.values():
            param_descs = []
            for param in skill.parameters:
                required = " (必填)" if param.required else ""
                param_descs.append(f"- {param.name}: {param.description}{required}")

            descriptions.append(
                f"{skill.name}: {skill.description}\n" + "\n".join(param_descs)
            )

        return "\n\n".join(descriptions)
