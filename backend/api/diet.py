"""饮食系统 API 接口"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.db.session import get_db
from backend.services.diet_service import DietService
from backend.schemas.system import (
    FuelBaseline,
    FuelBaselineUpdate,
    FuelStatistics,
    MealDeviationCreate,
    MealDeviationUpdate,
    MealDeviationResponse,
)
from backend.schemas.common import success_response, error_response


router = APIRouter(prefix="/api/diet", tags=["diet-system"])


# ============ 饮食基准管理 ============

@router.get("/baseline")
async def get_diet_baseline(db: Session = Depends(get_db)):
    """
    获取饮食基准

    返回用户设置的早餐、午餐、晚餐和口味基准
    """
    data, status_code = DietService.get_fuel_baseline(db)

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


@router.put("/baseline")
async def update_diet_baseline(
    request: FuelBaselineUpdate,
    db: Session = Depends(get_db)
):
    """
    更新饮食基准

    支持部分更新，可以只更新某些字段
    - breakfast: 早餐基准
    - lunch: 午餐基准
    - dinner: 晚餐基准
    - taste: 口味偏好列表
    """
    data, status_code = DietService.update_fuel_baseline(db, request)

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


# ============ 偏离事件管理 ============

@router.post("/deviations")
async def create_deviation(
    request: MealDeviationCreate,
    db: Session = Depends(get_db)
):
    """
    创建偏离事件

    记录饮食偏离基准的事件，只需填写偏离描述
    """
    data, status_code = DietService.create_meal_deviation(db, request)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="偏离事件创建成功",
        code=status_code
    )


@router.get("/deviations")
async def get_deviations(
    start_date: Optional[str] = Query(None, description="开始日期 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="结束日期 (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    获取偏离事件列表

    支持按日期范围过滤
    """
    data, status_code = DietService.get_meal_deviations(
        db,
        start_date=start_date,
        end_date=end_date,
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
        message="获取偏离事件成功"
    )


@router.get("/deviations/{deviation_id}")
async def get_deviation(
    deviation_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个偏离事件详情
    """
    data, status_code = DietService.get_meal_deviation(db, deviation_id)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取偏离事件成功"
    )


@router.patch("/deviations/{deviation_id}")
async def update_deviation(
    deviation_id: int,
    request: MealDeviationUpdate,
    db: Session = Depends(get_db)
):
    """
    更新偏离事件

    可以更新偏离描述
    """
    data, status_code = DietService.update_meal_deviation(
        db,
        deviation_id,
        request
    )

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="偏离事件更新成功"
    )


@router.delete("/deviations/{deviation_id}")
async def delete_deviation(
    deviation_id: int,
    db: Session = Depends(get_db)
):
    """
    删除偏离事件
    """
    data, status_code = DietService.delete_meal_deviation(db, deviation_id)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="偏离事件删除成功"
    )


# ============ 统计信息 ============

@router.get("/statistics")
async def get_diet_statistics(
    db: Session = Depends(get_db)
):
    """
    获取饮食统计信息

    包括总偏离次数、本月偏离次数、最近偏离时间等
    """
    data, status_code = DietService.get_fuel_statistics(db)

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


@router.get("/score-history")
async def get_score_history(
    days: int = Query(30, ge=1, le=365, description="查询天数范围"),
    db: Session = Depends(get_db)
):
    """
    获取评分变化历史

    返回指定天数内的评分变化记录
    """
    data, status_code = DietService.get_score_history(db, days=days)

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
