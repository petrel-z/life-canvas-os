"""
Agent API 路由

处理 Agent 聊天、确认和历史记录请求。
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
import uuid
import asyncio
import json

from backend.schemas.agent import (
    ChatRequest,
    ConfirmRequest,
    ConfirmResponse,
    HistoryResponse,
)
from backend.schemas.common import success_response, error_response
from backend.core.exceptions import AppException
from backend.agent.init import execute_chat, get_context_manager, get_pending_confirmations, execute_stream_chat

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/chat", response_model=Dict[str, Any])
async def chat(request: ChatRequest):
    """
    Agent 聊天接口

    处理用户的自然语言输入，返回 AI 回复和执行结果。
    """
    try:
        # 生成会话 ID
        session_id = request.session_id or f"sess_{uuid.uuid4().hex[:12]}"

        # 执行 Agent 聊天
        response_data = await execute_chat(
            message=request.message,
            session_id=session_id,
        )

        return success_response(
            data=response_data,
            message="聊天成功",
            code=200,
        )

    except AppException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(message=f"聊天失败：{str(e)}", code=500)


@router.post("/confirm", response_model=Dict[str, Any])
async def confirm(request: ConfirmRequest):
    """
    Agent 确认接口

    处理用户对高风险操作的确认请求。
    """
    try:
        # 查找待确认请求
        _pending_confirmations = get_pending_confirmations()
        confirmation = _pending_confirmations.get(request.confirmation_id)

        if not confirmation:
            return error_response(message="确认 ID 不存在或已过期", code=404)

        if not request.confirmed:
            # 用户取消
            del _pending_confirmations[request.confirmation_id]
            return success_response(
                data={"response": "操作已取消"},
                message="取消成功",
                code=200,
            )

        # 验证验证码（如果是 CRITICAL 等级）
        if confirmation.get("risk_level") == "CRITICAL":
            if not request.code or request.code != confirmation.get("code"):
                return error_response(message="验证码错误", code=400)

        # 执行确认后的操作
        action_type = confirmation.get("action_type")
        action_data = confirmation.get("action_data", {})

        if action_type == "delete_journal":
            journal_id = action_data.get("id") or action_data.get("journal_id")
            if not journal_id:
                return error_response(message="无效的删除请求", code=400)

            from backend.services.journal_service import JournalService
            from backend.db.session import get_db_context

            with get_db_context() as db:
                result, status_code = JournalService.delete_diary(db, journal_id)
                if status_code != 200:
                    return error_response(message=result.get("message", "删除失败"), code=status_code)

                del _pending_confirmations[request.confirmation_id]
                return success_response(
                    data={"response": f"已删除日记 ID: {journal_id}"},
                    message="删除成功",
                    code=200,
                )

        # 未知操作类型
        del _pending_confirmations[request.confirmation_id]
        return success_response(
            data={"response": "操作已确认并执行"},
            message="确认成功",
            code=200,
        )

    except AppException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return error_response(message=f"确认失败：{str(e)}", code=500)


@router.get("/history", response_model=Dict[str, Any])
async def get_history(session_id: str, limit: int = 10):
    """
    获取会话历史

    返回指定会话的对话历史记录。
    """
    try:
        ctx_manager = get_context_manager()
        if not ctx_manager:
            return error_response(message="上下文管理器未初始化", code=500)

        context = ctx_manager.get(session_id)
        if not context:
            return error_response(message="会话不存在", code=404)

        # 获取消息历史
        messages = context.messages[-limit:] if context.messages else []

        return success_response(
            data={"messages": messages, "session_id": session_id},
            message="获取历史成功",
            code=200,
        )

    except Exception as e:
        return error_response(message=f"获取历史失败：{str(e)}", code=500)


@router.delete("/session/{session_id}", response_model=Dict[str, Any])
async def delete_session(session_id: str):
    """
    删除会话

    清空指定会话的上下文和历史记录。
    """
    try:
        ctx_manager = get_context_manager()
        if ctx_manager:
            ctx_manager.delete(session_id)

        return success_response(
            data={"session_id": session_id},
            message="删除成功",
            code=200,
        )

    except Exception as e:
        return error_response(message=f"删除失败：{str(e)}", code=500)


@router.post("/chat/stream", response_class=StreamingResponse)
async def chat_stream(request: ChatRequest):
    """
    Agent 聊天接口（流式响应）

    处理用户的自然语言输入，以 SSE 流式返回 AI 回复。
    响应格式：data: {"type": "content", "data": "..."} 或 data: {"type": "done", "data": {...}}
    """
    try:
        # 生成会话 ID
        session_id = request.session_id or f"sess_{uuid.uuid4().hex[:12]}"

        async def generate():
            async for chunk in execute_stream_chat(
                message=request.message,
                session_id=session_id,
            ):
                # SSE 格式
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            # 结束标记
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except AppException as e:
        # 流式模式下无法返回 HTTP 错误，返回错误事件
        async def error_generate():
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
        return StreamingResponse(
            error_generate(),
            media_type="text/event-stream",
        )
    except Exception as e:
        async def error_generate():
            yield f"data: {json.dumps({'type': 'error', 'data': f'聊天失败：{str(e)}'})}\n\n"
        return StreamingResponse(
            error_generate(),
            media_type="text/event-stream",
        )


@router.get("/sessions", response_model=Dict[str, Any])
async def list_sessions():
    """
    获取会话列表

    返回所有活跃会话的摘要信息。
    """
    try:
        ctx_manager = get_context_manager()
        if not ctx_manager:
            return error_response(message="上下文管理器未初始化", code=500)

        stats = ctx_manager.get_stats()
        sessions = []

        # 获取所有会话的摘要
        for session_id, context in ctx_manager._contexts.items():
            last_message = context.messages[-1] if context.messages else None
            sessions.append({
                "session_id": session_id,
                "message_count": len(context.messages),
                "last_message_time": context.last_accessed.isoformat() if context.last_accessed else None,
                "last_message_preview": last_message["content"][:50] if last_message else None,
                "last_message_role": last_message["role"] if last_message else None,
            })

        # 按最后访问时间排序
        sessions.sort(key=lambda x: x["last_message_time"] or "", reverse=True)

        return success_response(
            data={"sessions": sessions, "stats": stats},
            message="获取会话列表成功",
            code=200,
        )

    except Exception as e:
        return error_response(message=f"获取会话列表失败：{str(e)}", code=500)


@router.get("/session/{session_id}", response_model=Dict[str, Any])
async def get_session(session_id: str):
    """
    获取会话详情

    返回指定会话的完整上下文信息。
    """
    try:
        ctx_manager = get_context_manager()
        if not ctx_manager:
            return error_response(message="上下文管理器未初始化", code=500)

        context = ctx_manager.get(session_id)
        if not context:
            return error_response(message="会话不存在", code=404)

        return success_response(
            data={
                "session_id": session_id,
                "messages": context.messages,
                "operations": context.last_operations,
                "references": context.references,
                "token_count": context.token_count,
            },
            message="获取会话详情成功",
            code=200,
        )

    except Exception as e:
        return error_response(message=f"获取会话详情失败：{str(e)}", code=500)
