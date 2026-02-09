"""AI 洞察 API 接口"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Literal

from backend.db.session import get_db
from backend.services.insight_service import InsightService
from backend.schemas.insight import (
    InsightGenerateRequest,
    InsightGenerateResponse,
    InsightResponse,
)
from backend.schemas.common import success_response, error_response


router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.post("/generate")
async def generate_insight(
    request: InsightGenerateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    生成洞察
    """
    data, status_code = await InsightService.generate_insight(db, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="洞察生成成功"
    )


@router.get("")
async def get_insights(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: str = Query("generated_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    db: Session = Depends(get_db)
):
    """
    获取洞察历史
    """
    data, status_code = InsightService.get_insights(
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
        message="获取洞察历史成功"
    )


@router.get("/latest")
async def get_latest_insight_endpoint(db: Session = Depends(get_db)):
    """
    获取最新洞察
    """
    data, status_code = InsightService.get_latest_insight_endpoint(db)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取最新洞察成功"
    )
