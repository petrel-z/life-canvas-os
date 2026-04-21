"""
ReAct 执行器（增强版）

实现 Reason + Act 交替进行的 Agent 执行逻辑，带有详细的推理过程追踪。
"""

import json
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
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


@dataclass
class ReasoningStep:
    """推理步骤数据结构"""
    iteration: int
    thought: str  # LLM 的思考内容
    action: Optional[str]  # 执行的动作（技能名称）
    action_input: Optional[Dict[str, Any]]  # 动作输入参数
    observation: Optional[str]  # 观察结果（技能执行结果）
    timestamp: str  # 时间戳


class ReActExecutor:
    """
    ReAct 执行器

    执行 Thought-Action-Observation 循环，直到：
    - 得到最终答案
    - 需要用户确认
    - 达到最大迭代次数

    ReAct 推理流程：
    1. Thought（思考）: 分析用户意图，决定下一步行动
    2. Action（行动）: 调用技能/工具执行操作
    3. Observation（观察）: 获取操作结果
    4. 循环 1-3 直到得出最终答案
    """

    def __init__(
        self,
        llm_client: LLMClientWithFallback,
        context_manager: ContextManager,
        skills: Dict[str, BaseSkill],
        tools: Dict[str, BaseTool],
        max_iterations: int = 5,
    ):
        """
        初始化执行器

        Args:
            llm_client: LLM 客户端
            context_manager: 上下文管理器
            skills: 技能字典
            tools: 工具字典
            max_iterations: 最大迭代次数
        """
        self.llm = llm_client
        self.context_manager = context_manager
        self.skills = skills
        self.tools = tools
        self.max_iterations = max_iterations

        # 推理过程追踪
        self.reasoning_traces: List[ReasoningStep] = []

    async def execute(
        self,
        message: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Tuple[SkillResult, bool]:
        """
        执行用户请求（带推理过程追踪）

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
        self.context_manager.add_message_to_context(session_id, "user", message)

        # 构建消息历史
        messages = self._build_messages(context, message)

        # 构建 Tool 定义
        tool_definitions = self._build_tool_definitions()

        logger.info(f"[ReAct] 开始执行，session_id={session_id}, message_length={len(message)}")

        # 执行 ReAct 循环
        iteration = 0
        self.reasoning_traces = []  # 重置推理追踪

        while iteration < self.max_iterations:
            iteration += 1
            logger.info(f"[ReAct] 第 {iteration}/{self.max_iterations} 次迭代")

            try:
                # ========== Step 1: Thought（思考）==========
                # 调用 LLM 进行推理
                response = await self.llm.chat(
                    messages=messages,
                    tools=tool_definitions if tool_definitions else None,
                )

                # 提取思考内容
                thought = response.content or ""
                has_tool_call = response.has_tool_calls

                logger.info(f"[ReAct] Thought: {thought[:200]}..." if len(thought) > 200 else f"[ReAct] Thought: {thought}")

                # ========== Step 2: Action（行动）==========
                if has_tool_call:
                    # 有工具调用
                    tool_results = await self._execute_tool_calls(
                        response.tool_calls, context, iteration
                    )

                    # 记录推理步骤
                    for tool_call in response.tool_calls:
                        function = tool_call.get("function", {})
                        reasoning_step = ReasoningStep(
                            iteration=iteration,
                            thought=thought,
                            action=function.get("name"),
                            action_input=function.get("arguments", {}),
                            observation="",  # 稍后填充
                            timestamp=datetime.now().isoformat()
                        )

                        # 添加观察结果
                        for result in tool_results:
                            if result.get("skill") == function.get("name"):
                                reasoning_step.observation = json.dumps(
                                    {"success": result.get("success"), "response": result.get("response")},
                                    ensure_ascii=False
                                )
                                break

                        self.reasoning_traces.append(reasoning_step)

                    # 添加观察结果到消息历史（供下一轮推理使用）
                    messages.append(
                        LLMMessage(
                            role="assistant",
                            content=thought or "正在处理...",
                        )
                    )

                    for result in tool_results:
                        obs_content = f"执行结果：{json.dumps(result, ensure_ascii=False)}"
                        messages.append(
                            LLMMessage(
                                role="user",
                                content=obs_content,
                            )
                        )
                        logger.info(f"[ReAct] Observation: {obs_content[:200]}..." if len(obs_content) > 200 else f"[ReAct] Observation: {obs_content}")

                    # 检查是否有需要确认的操作
                    for result in tool_results:
                        if result.get("requires_confirmation"):
                            logger.info(f"[ReAct] 需要用户确认：{result.get('confirmation_message')}")
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
                    responses = [r.get("response", "") for r in tool_results if r.get("response")]
                    final_response = "\n".join(responses) if responses else "操作已完成"

                    logger.info(f"[ReAct] 执行完成，返回结果")
                    return SkillResult.ok(final_response), False

                else:
                    # ========== Step 3: Final Answer（最终答案）==========
                    # 无工具调用，LLM 直接返回最终答案
                    logger.info(f"[ReAct] 得出最终答案")

                    # 记录最后的推理步骤
                    reasoning_step = ReasoningStep(
                        iteration=iteration,
                        thought=thought,
                        action=None,
                        action_input=None,
                        observation="最终答案",
                        timestamp=datetime.now().isoformat()
                    )
                    self.reasoning_traces.append(reasoning_step)

                    final_result = SkillResult.ok(thought or "我暂时没有更好的建议，换个话题试试吧～")

                    # 添加到上下文
                    self.context_manager.add_message_to_context(session_id, "assistant", thought or "我暂时没有更好的建议，换个话题试试吧～")

                    return final_result, False
 
            except Exception as e:
                logger.error(f"[ReAct] 执行出错：{e}", exc_info=True)
                return SkillResult.fail(f"执行出错：{str(e)}"), False

        # 达到最大迭代次数
        logger.warning(f"[ReAct] 达到最大迭代次数 ({self.max_iterations})，未能完成任务")
        return SkillResult.fail("达到最大迭代次数，未能完成任务"), False

    def get_reasoning_traces(self) -> List[Dict[str, Any]]:
        """
        获取推理过程追踪

        Returns:
            推理步骤列表
        """
        return [asdict(trace) for trace in self.reasoning_traces]

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
        self, tool_calls: List[Dict[str, Any]], context: ContextState, iteration: int = 0
    ) -> List[Dict[str, Any]]:
        """执行工具调用"""
        results = []

        for tool_call in tool_calls:
            function = tool_call.get("function", {})
            name = function.get("name")
            arguments = function.get("arguments", {})

            logger.info(f"[ReAct] 执行技能：{name}, 参数：{arguments}")

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
