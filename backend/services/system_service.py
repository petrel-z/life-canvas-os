"""
饮食系统服务 - 饮食管理业务逻辑

支持功能：
- 饮食基准的增删改查（早餐、午餐、晚餐、口味）
- 偏离事件的增删改查
- 饮食统计信息
"""
from typing import Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.orm.attributes import flag_modified

from backend.models.dimension import System, MealDeviation, DEFAULT_SYSTEM_DETAILS
from backend.models.user import User
from backend.schemas.system import (
    FuelBaseline,
    FuelBaselineUpdate,
    FuelStatistics,
    MealItem,
    MealDeviationCreate,
    MealDeviationUpdate,
    MealDeviationResponse,
)
from backend.schemas.common import error_response, success_response, PaginatedResponse
import json


class SystemService:
    """饮食系统服务类"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取默认用户"""
        return db.query(User).first()

    @staticmethod
    def get_or_create_fuel_system(db: Session, user_id: int) -> System:
        """获取或创建饮食系统"""
        system = db.query(System).filter(
            System.user_id == user_id,
            System.type == "FUEL"
        ).first()

        if not system:
            system = System(
                user_id=user_id,
                type="FUEL",
                score=50,
                details=DEFAULT_SYSTEM_DETAILS.get("FUEL", {})
            )
            db.add(system)
            db.commit()
            db.refresh(system)

        return system

    # ============ 饮食基准管理 ============

    @staticmethod
    def get_fuel_baseline(db: Session) -> Tuple[dict, int]:
        """
        获取饮食基准

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        # 获取当前基准配置
        details = system.details or {}
        baseline = FuelBaseline(
            breakfast=_parse_meal_items(details.get("baseline_breakfast", "[]")),
            lunch=_parse_meal_items(details.get("baseline_lunch", "[]")),
            dinner=_parse_meal_items(details.get("baseline_dinner", "[]")),
            taste=details.get("baseline_taste", [])
        )

        return success_response(
            data=baseline.model_dump(),
            message="获取饮食基准成功"
        ), 200

    @staticmethod
    def update_fuel_baseline(db: Session, request: FuelBaselineUpdate) -> Tuple[dict, int]:
        """
        更新饮食基准

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        # 获取当前配置
        details = system.details or {}

        # 更新指定的基准
        if request.breakfast is not None:
            details["baseline_breakfast"] = json.dumps([item.model_dump() for item in request.breakfast], ensure_ascii=False)
        if request.lunch is not None:
            details["baseline_lunch"] = json.dumps([item.model_dump() for item in request.lunch], ensure_ascii=False)
        if request.dinner is not None:
            details["baseline_dinner"] = json.dumps([item.model_dump() for item in request.dinner], ensure_ascii=False)
        if request.taste is not None:
            details["baseline_taste"] = request.taste

        # 标记 JSON 字段已修改（SQLAlchemy 需要显式标记才能追踪 JSON 内部变化）
        system.details = details
        flag_modified(system, "details")
        db.commit()
        db.refresh(system)

        return SystemService.get_fuel_baseline(db)

    # ============ 偏离事件管理 ============

    @staticmethod
    def create_meal_deviation(db: Session, request: MealDeviationCreate) -> Tuple[dict, int]:
        """
        创建偏离事件

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        deviation = MealDeviation(
            system_id=system.id,
            description=request.description,
            occurred_at=request.occurred_at or datetime.now()
        )
        db.add(deviation)
        db.commit()
        db.refresh(deviation)

        # 更新系统统计
        SystemService._update_fuel_statistics(db, system)

        return MealDeviationResponse.model_validate(deviation).model_dump(), 201

    @staticmethod
    def get_meal_deviations(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[dict, int]:
        """
        获取偏离事件列表

        Args:
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        # 构建查询
        query = db.query(MealDeviation).filter(MealDeviation.system_id == system.id)

        # 日期范围过滤
        if start_date:
            try:
                target_date = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(MealDeviation.occurred_at >= target_date)
            except ValueError:
                return error_response(message="开始日期格式错误，请使用 YYYY-MM-DD 格式", code=400), 400

        if end_date:
            try:
                target_date = datetime.strptime(end_date, "%Y-%m-%d").date()
                next_date = target_date + timedelta(days=1)
                query = query.filter(MealDeviation.occurred_at < next_date)
            except ValueError:
                return error_response(message="结束日期格式错误，请使用 YYYY-MM-DD 格式", code=400), 400

        # 排序
        query = query.order_by(MealDeviation.occurred_at.desc())

        # 分页
        total = query.count()
        offset = (page - 1) * page_size
        deviations = query.offset(offset).limit(page_size).all()

        items = [MealDeviationResponse.model_validate(d).model_dump() for d in deviations]
        paginated = PaginatedResponse.create(items, total, page, page_size)

        return paginated.model_dump(), 200

    @staticmethod
    def get_meal_deviation(db: Session, deviation_id: int) -> Tuple[dict, int]:
        """
        获取单个偏离事件详情

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        deviation = db.query(MealDeviation).filter(
            MealDeviation.id == deviation_id,
            MealDeviation.system_id == system.id
        ).first()

        if not deviation:
            return error_response(message="偏离事件不存在", code=404), 404

        return MealDeviationResponse.model_validate(deviation).model_dump(), 200

    @staticmethod
    def update_meal_deviation(
        db: Session,
        deviation_id: int,
        request: MealDeviationUpdate
    ) -> Tuple[dict, int]:
        """
        更新偏离事件

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        deviation = db.query(MealDeviation).filter(
            MealDeviation.id == deviation_id,
            MealDeviation.system_id == system.id
        ).first()

        if not deviation:
            return error_response(message="偏离事件不存在", code=404), 404

        # 更新字段
        if request.description is not None:
            deviation.description = request.description

        db.commit()
        db.refresh(deviation)

        return MealDeviationResponse.model_validate(deviation).model_dump(), 200

    @staticmethod
    def delete_meal_deviation(db: Session, deviation_id: int) -> Tuple[dict, int]:
        """
        删除偏离事件

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        deviation = db.query(MealDeviation).filter(
            MealDeviation.id == deviation_id,
            MealDeviation.system_id == system.id
        ).first()

        if not deviation:
            return error_response(message="偏离事件不存在", code=404), 404

        deleted_id = deviation.id
        db.delete(deviation)
        db.commit()

        # 更新系统统计
        SystemService._update_fuel_statistics(db, system)

        return {"deleted_id": deleted_id}, 200

    # ============ 统计信息 ============

    @staticmethod
    def get_fuel_statistics(db: Session) -> Tuple[dict, int]:
        """
        获取饮食统计信息

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        system = SystemService.get_or_create_fuel_system(db, user.id)

        # 获取所有偏离事件
        deviations = db.query(MealDeviation).filter(
            MealDeviation.system_id == system.id
        ).all()

        # 计算统计数据
        total_deviations = len(deviations)

        # 计算本月偏差
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_deviations = sum(
            1 for d in deviations
            if d.occurred_at >= month_start
        )

        # 获取最近一次偏离时间
        latest_deviation = None
        if deviations:
            latest_deviation = max(d.occurred_at for d in deviations)

        stats = FuelStatistics(
            total_deviations=total_deviations,
            monthly_deviations=monthly_deviations,
            latest_deviation=latest_deviation
        )

        return success_response(
            data=stats.model_dump(),
            message="获取饮食统计成功"
        ), 200

    @staticmethod
    def _update_fuel_statistics(db: Session, system: System):
        """
        更新饮食系统统计（内部方法）

        更新偏离事件统计数据
        """
        # 获取偏离事件统计
        deviations = db.query(MealDeviation).filter(
            MealDeviation.system_id == system.id
        ).all()

        total_deviations_count = len(deviations)

        # 计算本月偏差
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_deviations = sum(
            1 for d in deviations
            if d.occurred_at >= month_start
        )

        # 更新系统详情
        details = system.details or {}
        details["total_deviations"] = total_deviations_count
        details["monthly_deviations"] = monthly_deviations

        # 计算一致性分数（偏离越少分数越高）
        # 基础100分，每次偏离扣2分，最低0分
        consistency_score = max(0, 100 - total_deviations_count * 2)
        details["consistency"] = consistency_score

        # 标记 JSON 字段已修改
        system.details = details
        flag_modified(system, "details")
        system.score = consistency_score
        db.commit()


# ============ 辅助函数 ============

def _parse_meal_items(json_str: str) -> list[MealItem]:
    """解析餐食项 JSON 字符串"""
    try:
        data = json.loads(json_str)
        return [MealItem(**item) for item in data]
    except (json.JSONDecodeError, TypeError):
        return []
