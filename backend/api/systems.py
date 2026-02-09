"""系统管理 API 接口（八维系统）"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional, Literal

from backend.db.session import get_db
from backend.services.system_service import SystemService
from backend.schemas.system import (
    SystemResponse,
    SystemScoreUpdate,
    SystemScoreUpdateResponse,
    SystemLogCreate,
    SystemLogResponse,
    SystemActionCreate,
    SystemActionUpdate,
    SystemActionResponse,
    SystemActionDeleteResponse,
)
from backend.schemas.common import success_response, error_response


router = APIRouter(prefix="/api/systems", tags=["systems"])


# ============ 系统 CRUD ============

@router.get("")
async def get_systems(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("score"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db)
):
    """
    获取所有系统列表
    """
    data, status_code = SystemService.get_systems(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取系统列表成功"
    )


@router.get("/{system_type}")
async def get_system_detail(
    system_type: str,
    db: Session = Depends(get_db)
):
    """
    获取系统详情
    """
    data, status_code = SystemService.get_system_detail(db, system_type)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取系统详情成功"
    )


@router.patch("/{system_type}/score")
async def update_system_score(
    system_type: str,
    request: SystemScoreUpdate,
    db: Session = Depends(get_db)
):
    """
    更新系统评分
    """
    data, status_code = SystemService.update_system_score(db, system_type, request.score)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="评分更新成功"
    )


# ============ 系统日志 ============

@router.post("/{system_type}/logs")
async def create_system_log(
    system_type: str,
    request: SystemLogCreate,
    db: Session = Depends(get_db)
):
    """
    添加日志
    """
    data, status_code = SystemService.create_system_log(db, system_type, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="日志创建成功",
        code=status_code
    )


@router.get("/{system_type}/logs")
async def get_system_logs(
    system_type: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db)
):
    """
    获取日志列表
    """
    data, status_code = SystemService.get_system_logs(
        db,
        system_type,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取日志列表成功"
    )


# ============ 系统行动项 ============

@router.post("/{system_type}/actions")
async def create_system_action(
    system_type: str,
    request: SystemActionCreate,
    db: Session = Depends(get_db)
):
    """
    添加行动项
    """
    data, status_code = SystemService.create_system_action(db, system_type, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="行动项创建成功",
        code=status_code
    )


@router.patch("/{system_type}/actions/{action_id}")
async def update_system_action(
    system_type: str,
    action_id: int,
    request: SystemActionUpdate,
    db: Session = Depends(get_db)
):
    """
    更新行动项
    """
    data, status_code = SystemService.update_system_action(
        db,
        system_type,
        action_id,
        request
    )

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="行动项更新成功"
    )


@router.delete("/{system_type}/actions/{action_id}")
async def delete_system_action(
    system_type: str,
    action_id: int,
    db: Session = Depends(get_db)
):
    """
    删除行动项
    """
    data, status_code = SystemService.delete_system_action(db, system_type, action_id)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="行动项删除成功"
    )
