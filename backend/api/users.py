"""用户配置 API 接口"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from backend.db.session import get_db
from backend.services.user_service import UserService
from backend.schemas.user import (
    UserUpdate,
    UserResponse,
    UserSettingsUpdate,
    UserSettingsResponse,
    AIConfigBase,
    AIConfigResponse,
)
from backend.schemas.common import success_response, error_response


router = APIRouter(prefix="/api/user", tags=["user"])


# ============ 用户信息 ============

@router.get("/profile")
async def get_user_profile(db: Session = Depends(get_db)):
    """
    获取用户信息
    """
    data, status_code = UserService.get_user_profile(db)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取用户信息成功"
    )


@router.patch("/profile")
async def update_user_profile(
    request: UserUpdate,
    db: Session = Depends(get_db)
):
    """
    更新用户信息
    """
    data, status_code = UserService.update_user_profile_enhanced(db, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="用户信息更新成功"
    )


# ============ 用户设置 ============

@router.get("/settings")
async def get_user_settings(db: Session = Depends(get_db)):
    """
    获取用户设置
    """
    data, status_code = UserService.get_user_settings(db)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取用户设置成功"
    )


@router.patch("/settings")
async def update_user_settings(
    request: UserSettingsUpdate,
    db: Session = Depends(get_db)
):
    """
    更新用户设置
    """
    data, status_code = UserService.update_user_settings(db, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="用户设置更新成功"
    )


# ============ AI 配置 ============

@router.post("/ai-config")
async def save_ai_config(
    request: AIConfigBase,
    db: Session = Depends(get_db)
):
    """
    保存 AI 配置
    """
    data, status_code = UserService.save_ai_config(
        db,
        request.provider,
        request.api_key,
        request.model_name or "deepseek-chat"
    )

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data={
            "provider": data.get("provider"),
            "model_name": data.get("model"),
            "updated_at": data.get("updated_at") if isinstance(data, dict) else None
        },
        message="AI 配置保存成功"
    )


@router.get("/ai-config")
async def get_ai_config(db: Session = Depends(get_db)):
    """
    获取 AI 配置（不返回完整 API Key）
    """
    data, status_code = UserService.get_ai_config_masked(db)

    if status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail=error_response(
                message="AI 服务未配置",
                code=424,
                data={"hint": "请先配置 AI 服务"}
            )
        )

    return success_response(
        data=data,
        message="获取 AI 配置成功"
    )
