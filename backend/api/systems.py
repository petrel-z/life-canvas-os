"""八大系统 API 接口"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.services.system_service import SystemService
from backend.schemas.common import success_response


router = APIRouter(prefix="/api/systems", tags=["systems"])


@router.get("/scores")
async def get_all_systems_scores(db: Session = Depends(get_db)):
    """
    获取八大系统评分摘要

    返回所有系统的当前评分和平均分
    """
    data, status_code = SystemService.get_all_systems_scores(db)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data["data"],
        message=data["message"],
        code=data["code"]
    )