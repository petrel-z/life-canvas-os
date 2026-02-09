"""认证相关 API 接口"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
import json

from backend.db.session import get_db
from backend.services.auth_service import AuthService
from backend.schemas.user import (
    PinSetupRequest,
    PinVerifyRequest,
    PinChangeRequest,
    PinSetupResponse,
    PinVerifyResponse,
    AuthStatusResponse,
    LockResponse,
)
from backend.schemas.common import success_response


router = APIRouter(prefix="/api/pin", tags=["authentication"])


# ============ API 路由 ============

@router.post("/setup")
async def setup_pin(
    request: PinSetupRequest,
    db: Session = Depends(get_db)
):
    """
    设置 PIN 码（首次）

    验证规则：6 位数字
    """
    data, status_code = AuthService.setup_pin(db, request.pin)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="PIN 设置成功",
        code=status_code
    )


@router.post("/verify")
async def verify_pin_code(
    request: PinVerifyRequest,
    db: Session = Depends(get_db)
):
    """
    验证 PIN 码
    """
    data, status_code = AuthService.verify_pin(db, request.pin)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="验证成功"
    )


@router.post("/change")
async def change_pin(
    request: PinChangeRequest,
    db: Session = Depends(get_db)
):
    """
    修改 PIN 码
    """
    data, status_code = AuthService.change_pin(db, request.old_pin, request.new_pin)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="PIN 修改成功"
    )


@router.post("/lock")
async def lock_app(db: Session = Depends(get_db)):
    """
    锁定应用
    """
    # 这个接口主要用于前端状态管理
    # 实际锁定由前端控制
    return success_response(
        data=LockResponse(locked_at=datetime.now()).model_dump(),
        message="应用已锁定"
    )


@router.get("/status")
async def get_pin_status(db: Session = Depends(get_db)):
    """
    获取 PIN 状态
    """
    data = AuthService.get_pin_status(db)

    return success_response(
        data=data,
        message="状态获取成功"
    )


# ============ IPC 通信处理器 ============

import asyncio

def _run_async(coro):
    """在新事件循环中运行异步函数"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def handle_auth_action(action: str, params: dict) -> dict:
    """
    处理 IPC 通信中的认证相关操作

    Args:
        action: 操作类型
        params: 操作参数

    Returns:
        操作结果
    """
    from backend.db.session import SessionLocal

    db = SessionLocal()
    try:
        if action == 'verify_pin':
            pin = params.get('pin', '')
            request = PinVerifyRequest(pin=pin)
            try:
                result = _run_async(verify_pin_code(request, db))
                return {
                    'action': 'verify_pin',
                    'status': 'ok',
                    'data': result['data']
                }
            except HTTPException as e:
                return {
                    'action': 'verify_pin',
                    'status': 'error',
                    'error': e.detail
                }

        elif action == 'set_pin':
            pin = params.get('pin', '')
            request = PinSetupRequest(pin=pin)
            try:
                result = _run_async(setup_pin(request, db))
                return {
                    'action': 'set_pin',
                    'status': 'ok',
                    'data': result['data']
                }
            except HTTPException as e:
                return {
                    'action': 'set_pin',
                    'status': 'error',
                    'error': e.detail
                }

        elif action == 'get_auth_status':
            try:
                result = _run_async(get_pin_status(db))
                return {
                    'action': 'get_auth_status',
                    'status': 'ok',
                    'data': result['data']
                }
            except HTTPException as e:
                return {
                    'action': 'get_auth_status',
                    'status': 'error',
                    'error': e.detail
                }

        else:
            return {
                'action': action,
                'status': 'error',
                'error': '未知的认证操作'
            }
    finally:
        db.close()
