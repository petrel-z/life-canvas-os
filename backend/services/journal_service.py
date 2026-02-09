"""
日记服务 - 日记管理业务逻辑
"""
from typing import Optional, Tuple, Literal
from sqlalchemy.orm import Session

from backend.models.user import User
from backend.models.diary import Diary, MOOD_TYPES
from backend.schemas.journal import (
    DiaryCreate,
    DiaryUpdate,
    DiaryResponse,
    DiaryDeleteResponse,
    MoodType,
)
from backend.schemas.common import error_response, PaginatedResponse


class JournalService:
    """日记服务类"""

    @staticmethod
    def get_user(db: Session) -> User:
        """获取或创建默认用户"""
        user = db.query(User).first()
        if not user:
            # 创建默认用户
            from backend.services.auth_service import AuthService
            user = AuthService.create_default_user(db)
        return user

    @staticmethod
    def create_diary(db: Session, request: DiaryCreate) -> Tuple[dict, int]:
        """
        创建日记

        Returns:
            (response_data, status_code)
        """
        user = JournalService.get_user(db)

        # 验证心情值
        if request.mood and request.mood not in MOOD_TYPES:
            return error_response(
                message="参数验证失败",
                code=422,
                data={
                    "errors": [
                        {
                            "field": "mood",
                            "message": "心情值无效",
                            "value": request.mood
                        }
                    ]
                }
            ), 422

        diary = Diary(
            user_id=user.id,
            title=request.title,
            content=request.content,
            mood=request.mood,
            tags=request.tags,
            related_system=request.related_system,
            is_private=1 if request.is_private else 0
        )

        db.add(diary)
        db.commit()
        db.refresh(diary)

        return DiaryResponse.model_validate(diary).model_dump(), 201

    @staticmethod
    def get_diaries(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        mood: Optional[MoodType] = None,
        related_system: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: Literal["asc", "desc"] = "desc"
    ) -> Tuple[dict, int]:
        """
        获取日记列表

        Returns:
            (response_data, status_code)
        """
        user = JournalService.get_user(db)

        # 构建查询
        query = db.query(Diary).filter(Diary.user_id == user.id)

        # 筛选
        if mood:
            query = query.filter(Diary.mood == mood)

        if related_system:
            query = query.filter(Diary.related_system == related_system)

        # 排序
        order_column = getattr(Diary, sort_by, Diary.created_at)
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())

        # 分页
        total = query.count()
        offset = (page - 1) * page_size
        diaries = query.offset(offset).limit(page_size).all()

        items = [DiaryResponse.model_validate(d) for d in diaries]
        paginated = PaginatedResponse.create(items, total, page, page_size)

        return paginated.model_dump(), 200

    @staticmethod
    def get_diary_detail(db: Session, diary_id: int) -> Tuple[dict, int]:
        """
        获取日记详情

        Returns:
            (response_data, status_code)
        """
        user = JournalService.get_user(db)

        diary = db.query(Diary).filter(
            Diary.id == diary_id,
            Diary.user_id == user.id
        ).first()

        if not diary:
            return error_response(
                message="日记不存在",
                code=404,
                data={
                    "resource": "Diary",
                    "identifier": str(diary_id)
                }
            ), 404

        return DiaryResponse.model_validate(diary).model_dump(), 200

    @staticmethod
    def update_diary(db: Session, diary_id: int, request: DiaryUpdate) -> Tuple[dict, int]:
        """
        更新日记

        Returns:
            (response_data, status_code)
        """
        user = JournalService.get_user(db)

        diary = db.query(Diary).filter(
            Diary.id == diary_id,
            Diary.user_id == user.id
        ).first()

        if not diary:
            return error_response(
                message="日记不存在",
                code=404
            ), 404

        # 更新字段
        if request.title is not None:
            diary.title = request.title
        if request.content is not None:
            diary.content = request.content
        if request.mood is not None:
            if request.mood not in MOOD_TYPES:
                return error_response(
                    message="心情值无效",
                    code=422
                ), 422
            diary.mood = request.mood
        if request.tags is not None:
            diary.tags = request.tags
        if request.related_system is not None:
            diary.related_system = request.related_system
        if request.is_private is not None:
            diary.is_private = 1 if request.is_private else 0

        db.commit()
        db.refresh(diary)

        return DiaryResponse.model_validate(diary).model_dump(), 200

    @staticmethod
    def delete_diary(db: Session, diary_id: int) -> Tuple[dict, int]:
        """
        删除日记

        Returns:
            (response_data, status_code)
        """
        user = JournalService.get_user(db)

        diary = db.query(Diary).filter(
            Diary.id == diary_id,
            Diary.user_id == user.id
        ).first()

        if not diary:
            return error_response(
                message="日记不存在",
                code=404
            ), 404

        deleted_id = diary.id
        db.delete(diary)
        db.commit()

        return DiaryDeleteResponse(deleted_id=deleted_id).model_dump(), 200
