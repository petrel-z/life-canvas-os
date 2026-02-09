"""
系统服务 - 八维系统管理业务逻辑
"""
from typing import Optional, Tuple, List, Literal
from sqlalchemy.orm import Session

from backend.models.dimension import System, SystemLog, SystemAction, SYSTEM_TYPES, DEFAULT_SYSTEM_DETAILS
from backend.models.user import User
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
from backend.schemas.common import error_response, PaginatedResponse


class SystemService:
    """系统服务类"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取默认用户"""
        return db.query(User).first()

    @staticmethod
    def get_or_create_system(db: Session, user_id: int, system_type: str) -> System:
        """获取或创建系统"""
        system = db.query(System).filter(
            System.user_id == user_id,
            System.type == system_type
        ).first()

        if not system:
            system = System(
                user_id=user_id,
                type=system_type,
                score=50,
                details=DEFAULT_SYSTEM_DETAILS.get(system_type, {})
            )
            db.add(system)
            db.commit()
            db.refresh(system)

        return system

    @staticmethod
    def ensure_all_systems_exist(db: Session, user_id: int):
        """确保所有系统都已创建"""
        for system_type in SYSTEM_TYPES:
            SystemService.get_or_create_system(db, user_id, system_type)

    @staticmethod
    def get_systems(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "score",
        sort_order: Literal["asc", "desc"] = "desc"
    ) -> Tuple[dict, int]:
        """
        获取所有系统列表

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            # 如果用户不存在，先创建
            from backend.services.auth_service import AuthService
            user = AuthService.create_default_user(db)

        # 确保所有系统存在
        SystemService.ensure_all_systems_exist(db, user.id)

        # 构建查询
        query = db.query(System).filter(System.user_id == user.id)

        # 排序
        order_column = getattr(System, sort_by, System.created_at)
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())

        # 分页
        total = query.count()
        offset = (page - 1) * page_size
        systems = query.offset(offset).limit(page_size).all()

        # 转换为响应格式
        items = [SystemResponse.model_validate(s) for s in systems]
        paginated = PaginatedResponse.create(items, total, page, page_size)

        return paginated.model_dump(), 200

    @staticmethod
    def get_system_detail(db: Session, system_type: str) -> Tuple[dict, int]:
        """
        获取系统详情

        Returns:
            (response_data, status_code)
        """
        # 验证系统类型
        if system_type not in SYSTEM_TYPES:
            return error_response(
                message="系统不存在",
                code=404,
                data={
                    "resource": "System",
                    "identifier": system_type
                }
            ), 404

        user = SystemService.get_user(db)
        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        system = SystemService.get_or_create_system(db, user.id, system_type)

        return SystemResponse.model_validate(system).model_dump(), 200

    @staticmethod
    def update_system_score(db: Session, system_type: str, score: int) -> Tuple[dict, int]:
        """
        更新系统评分

        Returns:
            (response_data, status_code)
        """
        if system_type not in SYSTEM_TYPES:
            return error_response(
                message="系统不存在",
                code=404
            ), 404

        user = SystemService.get_user(db)
        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        system = SystemService.get_or_create_system(db, user.id, system_type)
        old_score = system.score
        system.score = score
        db.commit()
        db.refresh(system)

        return SystemScoreUpdateResponse(
            id=system.id,
            type=system_type,
            old_score=old_score,
            new_score=score,
            updated_at=system.updated_at
        ).model_dump(), 200

    @staticmethod
    def create_system_log(db: Session, system_type: str, request: SystemLogCreate) -> Tuple[dict, int]:
        """
        添加日志

        Returns:
            (response_data, status_code)
        """
        if system_type not in SYSTEM_TYPES:
            return error_response(
                message="系统不存在",
                code=404
            ), 404

        user = SystemService.get_user(db)
        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        system = SystemService.get_or_create_system(db, user.id, system_type)

        log = SystemLog(
            system_id=system.id,
            label=request.label,
            value=request.value,
            meta_data=request.meta_data
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        return SystemLogResponse.model_validate(log).model_dump(), 201

    @staticmethod
    def get_system_logs(
        db: Session,
        system_type: str,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: Literal["asc", "desc"] = "desc"
    ) -> Tuple[dict, int]:
        """
        获取日志列表

        Returns:
            (response_data, status_code)
        """
        if system_type not in SYSTEM_TYPES:
            return error_response(
                message="系统不存在",
                code=404
            ), 404

        user = SystemService.get_user(db)
        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        system = SystemService.get_or_create_system(db, user.id, system_type)

        # 构建查询
        query = db.query(SystemLog).filter(SystemLog.system_id == system.id)

        # 排序
        order_column = getattr(SystemLog, sort_by, SystemLog.created_at)
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())

        # 分页
        total = query.count()
        offset = (page - 1) * page_size
        logs = query.offset(offset).limit(page_size).all()

        items = [SystemLogResponse.model_validate(log) for log in logs]
        paginated = PaginatedResponse.create(items, total, page, page_size)

        return paginated.model_dump(), 200

    @staticmethod
    def create_system_action(db: Session, system_type: str, request: SystemActionCreate) -> Tuple[dict, int]:
        """
        添加行动项

        Returns:
            (response_data, status_code)
        """
        if system_type not in SYSTEM_TYPES:
            return error_response(
                message="系统不存在",
                code=404
            ), 404

        user = SystemService.get_user(db)
        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        system = SystemService.get_or_create_system(db, user.id, system_type)

        action = SystemAction(
            system_id=system.id,
            text=request.text,
            completed=1 if request.completed else 0
        )
        db.add(action)
        db.commit()
        db.refresh(action)

        return SystemActionResponse.model_validate(action).model_dump(), 201

    @staticmethod
    def update_system_action(
        db: Session,
        system_type: str,
        action_id: int,
        request: SystemActionUpdate
    ) -> Tuple[dict, int]:
        """
        更新行动项

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        system = SystemService.get_or_create_system(db, user.id, system_type)

        action = db.query(SystemAction).filter(
            SystemAction.id == action_id,
            SystemAction.system_id == system.id
        ).first()

        if not action:
            return error_response(
                message="行动项不存在",
                code=404
            ), 404

        # 更新字段
        if request.text is not None:
            action.text = request.text
        if request.completed is not None:
            action.completed = 1 if request.completed else 0

        db.commit()
        db.refresh(action)

        return SystemActionResponse.model_validate(action).model_dump(), 200

    @staticmethod
    def delete_system_action(db: Session, system_type: str, action_id: int) -> Tuple[dict, int]:
        """
        删除行动项

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(
                message="用户不存在",
                code=404
            ), 404

        system = SystemService.get_or_create_system(db, user.id, system_type)

        action = db.query(SystemAction).filter(
            SystemAction.id == action_id,
            SystemAction.system_id == system.id
        ).first()

        if not action:
            return error_response(
                message="行动项不存在",
                code=404
            ), 404

        deleted_id = action.id
        db.delete(action)
        db.commit()

        return SystemActionDeleteResponse(deleted_id=deleted_id).model_dump(), 200
