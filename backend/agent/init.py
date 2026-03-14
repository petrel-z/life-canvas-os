"""
Agent 模块初始化

负责初始化 LLM 客户端、注册 Skills、创建执行器实例。
"""

import os
from typing import Dict, Any, Optional
from .llm.base import LLMClient, LLMMessage, LLMToolDefinition, LLMResponse, LLMProviderType
from .llm.client_with_fallback import LLMClientWithFallback
from .llm.factory import LLMClientFactory
from .skills.base import BaseSkill, RiskLevel
from .skills.registry import SkillRegistry
from .tools.registry import ToolRegistry
from .core.context import ContextManager, get_context_manager
from .core.executor import ReActExecutor

# 全局 Agent 执行器实例
_agent_executor: Optional[ReActExecutor] = None
_context_manager: Optional[ContextManager] = None
_pending_confirmations: Dict[str, Dict[str, Any]] = {}


def _get_api_key_from_db() -> tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    从数据库读取 AI 配置

    Returns:
        (deepseek_api_key, deepseek_model, doubao_api_key, doubao_model) 元组
    """
    try:
        from backend.db.session import get_db_context
        from backend.models.user import User
        from backend.services.user_service import UserService

        with get_db_context() as db:
            user = db.query(User).first()
            if not user or not user.ai_config:
                return None, None, None, None

            ai_config = user.ai_config
            provider = ai_config.get("provider", "")
            encrypted_key = ai_config.get("api_key", "")
            model = ai_config.get("model", "")

            # 解密 API Key
            try:
                api_key = UserService.decrypt_api_key(encrypted_key)
            except Exception:
                # 解密失败，可能是加密格式变化
                api_key = encrypted_key

            if provider == "deepseek":
                return api_key, model or "deepseek-chat", None, None
            elif provider == "doubao":
                return None, None, api_key, model or "doubao-seed-2-0-lite-260215"
            else:
                return None, None, None, None

    except Exception as e:
        print(f"从数据库读取 AI 配置失败：{e}")
        return None, None, None, None


def _create_llm_client_with_fallback() -> LLMClientWithFallback:
    """
    创建带故障转移的 LLM 客户端

    Returns:
        LLMClientWithFallback: LLM 客户端实例
    """
    clients = []

    # 从数据库读取 AI 配置
    deepseek_key, deepseek_model, doubao_key, doubao_model = _get_api_key_from_db()

    # 尝试创建 DeepSeek 客户端
    if deepseek_key:
        try:
            from .llm.deepseek import DeepSeekClient
            client = LLMClientFactory.create(
                LLMProviderType.DEEPSEEK,
                {"api_key": deepseek_key, "base_url": "https://api.deepseek.com", "model": deepseek_model}
            )
            if client:
                clients.append(client)
                print(f"DeepSeek 客户端创建成功，模型：{deepseek_model}")
        except Exception as e:
            print(f"创建 DeepSeek 客户端失败：{e}")

    # 尝试创建豆包客户端
    if doubao_key:
        try:
            from .llm.doubao import DoubaoClient
            client = LLMClientFactory.create(
                LLMProviderType.DOUBAO,
                {"api_key": doubao_key, "base_url": "https://ark.cn-beijing.volces.com/api/v3", "model": doubao_model}
            )
            if client:
                clients.append(client)
                print(f"豆包客户端创建成功，模型：{doubao_model}")
        except Exception as e:
            print(f"创建豆包客户端失败：{e}")

    # 如果没有任何客户端，创建一个空的 DeepSeek 客户端（会在运行时失败）
    if not clients:
        from .llm.deepseek import DeepSeekClient
        clients.append(DeepSeekClient(api_key="", base_url="https://api.deepseek.com", model="deepseek-chat"))
        print("警告：未找到 AI 配置，创建一个空的 DeepSeek 客户端")

    return LLMClientWithFallback(clients=clients)


def initialize_agent() -> ReActExecutor:
    """
    初始化 Agent 执行器

    Returns:
        ReActExecutor: Agent 执行器实例
    """
    global _agent_executor, _context_manager

    # 创建 LLM 客户端（带故障转移）
    llm_client = _create_llm_client_with_fallback()

    # 获取上下文管理器
    _context_manager = get_context_manager()

    # 创建 Skill 注册中心并注册所有 Skills
    skill_registry = SkillRegistry()
    skill_registry.register(CreateJournalSkill(), category="journal")
    skill_registry.register(QueryJournalsSkill(), category="journal")
    skill_registry.register(UpdateJournalSkill(), category="journal")
    skill_registry.register(DeleteJournalSkill(), category="journal")

    # 注册记忆系统 Skills
    from .skills.memory_skills import (
        CreateMemorySkill,
        QueryMemoriesSkill,
        SummarizeMemoriesSkill,
        ForgetMemorySkill,
    )
    skill_registry.register(CreateMemorySkill(), category="memory")
    skill_registry.register(QueryMemoriesSkill(), category="memory")
    skill_registry.register(SummarizeMemoriesSkill(), category="memory")
    skill_registry.register(ForgetMemorySkill(), category="memory")

    # 注册七维系统 Skills
    from .skills.system_skills import (
        GetSystemScoreSkill,
        UpdateSystemScoreSkill,
        AddSystemLogSkill,
        AddSystemActionSkill,
        CompleteSystemActionSkill,
        ListSystemActionsSkill,
    )
    skill_registry.register(GetSystemScoreSkill(), category="system")
    skill_registry.register(UpdateSystemScoreSkill(), category="system")
    skill_registry.register(AddSystemLogSkill(), category="system")
    skill_registry.register(AddSystemActionSkill(), category="system")
    skill_registry.register(CompleteSystemActionSkill(), category="system")
    skill_registry.register(ListSystemActionsSkill(), category="system")

    # 获取所有 Skills
    skills = skill_registry.get_all()

    # 创建 Tool 注册中心（预留扩展）
    tool_registry = ToolRegistry()
    tools = tool_registry.get_all()

    # 创建执行器
    _agent_executor = ReActExecutor(
        llm_client=llm_client,
        context_manager=_context_manager,
        skills=skills,
        tools=tools,
    )

    return _agent_executor


def get_agent_executor() -> Optional[ReActExecutor]:
    """获取 Agent 执行器实例"""
    return _agent_executor


def get_context_manager_instance() -> Optional[ContextManager]:
    """获取上下文管理器实例"""
    return _context_manager


def get_pending_confirmations() -> Dict[str, Dict[str, Any]]:
    """获取待确认请求字典"""
    return _pending_confirmations


async def execute_chat(
    message: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    执行聊天请求

    Args:
        message: 用户消息
        session_id: 会话 ID
        user_id: 用户 ID

    Returns:
        响应数据字典
    """
    global _agent_executor, _pending_confirmations

    # 如果执行器未初始化，则初始化
    if _agent_executor is None:
        _agent_executor = initialize_agent()

    # 执行 ReAct 循环
    result, requires_confirmation = await _agent_executor.execute(
        message=message,
        session_id=session_id,
        user_id=user_id,
    )

    # 构建响应
    response_data = {
        "response": result.response,
        "action_taken": result.data,
        "requires_confirmation": result.requires_confirmation,
        "session_id": session_id,
    }

    # 处理确认请求
    if result.requires_confirmation:
        confirmation_id = result.confirmation_id or f"confirm_{len(_pending_confirmations) + 1}"

        # 存储确认请求
        _pending_confirmations[confirmation_id] = {
            "session_id": session_id,
            "risk_level": RiskLevel.HIGH.value,  # 默认高风险
            "action_type": "delete_journal" if "delete" in (result.data or {}) else "unknown",
            "action_data": result.data or {},
            "confirmation_message": result.confirmation_message,
        }

        response_data["confirmation_id"] = confirmation_id
        response_data["confirmation_message"] = result.confirmation_message

    return response_data


async def execute_stream_chat(
    message: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
):
    """
    执行流式聊天请求

    Args:
        message: 用户消息
        session_id: 会话 ID
        user_id: 用户 ID

    Yields:
        流式响应数据块
    """
    global _agent_executor, _pending_confirmations

    # 如果执行器未初始化，则初始化
    if _agent_executor is None:
        _agent_executor = initialize_agent()

    # 获取上下文
    context = _agent_executor.context_manager.get_or_create(session_id)

    # 添加用户消息
    context.add_message("user", message)

    # 构建消息
    messages = _agent_executor._build_messages(context, message)

    # 构建 Tool 定义
    tool_definitions = _agent_executor._build_tool_definitions()

    # 调用 LLM 获取响应（先不流式，因为可能有工具调用）
    try:
        response = await _agent_executor.llm.chat(
            messages=messages,
            tools=tool_definitions if tool_definitions else None,
        )
    except Exception as e:
        yield {"type": "error", "data": f"LLM 调用失败：{str(e)}"}
        return

    # 检查是否有工具调用
    if response.has_tool_calls:
        # 执行工具调用
        tool_results = await _agent_executor._execute_tool_calls(
            response.tool_calls, context
        )

        # 检查是否有需要确认的操作
        for result in tool_results:
            if result.get("requires_confirmation"):
                yield {
                    "type": "confirmation",
                    "data": {
                        "confirmation_id": result.get("confirmation_id"),
                        "confirmation_message": result.get("confirmation_message"),
                        "risk_level": "HIGH",
                    }
                }
                return

        # 返回工具执行结果（流式输出）
        responses = [r.get("response", "") for r in tool_results if r.get("response")]
        final_response = "\n".join(responses) if responses else "操作已完成"

        # 流式输出响应
        for char in final_response:
            yield {"type": "content", "data": char}
            await asyncio.sleep(0.02)  # 模拟打字机效果

        context.add_message("assistant", final_response)
        yield {"type": "done", "data": {"response": final_response, "session_id": session_id}}
    else:
        # 没有工具调用，直接流式返回内容
        content = response.content or "我暂时没有更好的建议，换个话题试试吧～"

        # 流式输出响应
        for char in content:
            yield {"type": "content", "data": char}
            await asyncio.sleep(0.02)  # 模拟打字机效果

        context.add_message("assistant", content)
        yield {"type": "done", "data": {"response": content, "session_id": session_id}}


# 在这里导入以避免循环依赖
from .skills.journal_skills import (
    CreateJournalSkill,
    QueryJournalsSkill,
    UpdateJournalSkill,
    DeleteJournalSkill,
)
