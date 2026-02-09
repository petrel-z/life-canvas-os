"""日记管理 API 接口"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional, Literal

from backend.db.session import get_db
from backend.services.journal_service import JournalService
from backend.schemas.journal import (
    DiaryCreate,
    DiaryUpdate,
    DiaryResponse,
    DiaryDeleteResponse,
    MoodType,
)
from backend.schemas.common import success_response, error_response


router = APIRouter(prefix="/api/journal", tags=["journals"])


# ============ 日记 CRUD ============

@router.post("")
async def create_diary(
    request: DiaryCreate,
    db: Session = Depends(get_db)
):
    """
    创建日记
    """
    data, status_code = JournalService.create_diary(db, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="日记创建成功",
        code=status_code
    )


@router.get("")
async def get_diaries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    mood: Optional[MoodType] = Query(None),
    related_system: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db)
):
    """
    获取日记列表
    """
    data, status_code = JournalService.get_diaries(
        db,
        page=page,
        page_size=page_size,
        mood=mood,
        related_system=related_system,
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
        message="获取日记列表成功"
    )


@router.get("/{diary_id}")
async def get_diary_detail(
    diary_id: int,
    db: Session = Depends(get_db)
):
    """
    获取日记详情
    """
    data, status_code = JournalService.get_diary_detail(db, diary_id)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取日记详情成功"
    )


@router.patch("/{diary_id}")
async def update_diary(
    diary_id: int,
    request: DiaryUpdate,
    db: Session = Depends(get_db)
):
    """
    更新日记
    """
    data, status_code = JournalService.update_diary(db, diary_id, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="日记更新成功"
    )


@router.delete("/{diary_id}")
async def delete_diary(
    diary_id: int,
    db: Session = Depends(get_db)
):
    """
    删除日记
    """
    data, status_code = JournalService.delete_diary(db, diary_id)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="日记删除成功"
    )
