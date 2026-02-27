"""
审计时间轴 API 接口
聚合日记和饮食偏离事件，按时间排序并按日期分组
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.services.timeline_service import TimelineService
from backend.schemas.timeline import TimelineEventType
from backend.schemas.common import success_response


router = APIRouter(prefix="/api/timeline", tags=["timeline"])


@router.get("")
async def get_timeline(
    type: TimelineEventType = Query("all", description="事件类型过滤：all, diary, diet"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(30, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db)
):
    """
    获取审计时间轴

    聚合日记和饮食偏离事件，按时间排序并按日期分组

    参数：
    - type: 事件类型过滤，可选值: all（全部）、diary（日记）、diet（饮食偏离）
    - page: 页码，从 1 开始
    - page_size: 每页数量，最大 100

    返回：
    - timeline: 按日期分组的事件列表
    - total_events: 总事件数
    - has_more: 是否有更多数据
    """
    data, status_code = TimelineService.get_timeline(
        db,
        type=type,
        page=page,
        page_size=page_size
    )

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取审计时间轴成功"
    )
