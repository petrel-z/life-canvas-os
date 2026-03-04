"""
审计时间轴服务
聚合日记和饮食偏离事件，按时间排序并分组
"""
from typing import Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from backend.models.diary import Diary
from backend.models.dimension import MealDeviation
from backend.models.user import User
from backend.schemas.timeline import (
    TimelineEventItem,
    TimelineDateGroup,
    TimelineResponse,
    TimelineEventType,
)
from backend.schemas.common import error_response
from backend.services.diet_service import DietService


class TimelineService:
    """审计时间轴服务类"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取默认用户"""
        return db.query(User).first()

    @staticmethod
    def get_timeline(
        db: Session,
        type: TimelineEventType = "all",
        page: int = 1,
        page_size: int = 30
    ) -> Tuple[dict, int]:
        """
        获取审计时间轴

        聚合日记和饮食偏离事件，按时间排序并按日期分组

        Args:
            db: 数据库会话
            type: 事件类型过滤 (all, diary, diet)
            page: 页码
            page_size: 每页数量

        Returns:
            (response_data, status_code)
        """
        user = TimelineService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        events = []

        # 获取日记事件（使用 created_at 作为事件时间）
        if type in ["all", "diary"]:
            diaries = db.query(Diary).filter(Diary.user_id == user.id).all()
            for diary in diaries:
                events.append(TimelineEventItem(
                    id=f"diary_{diary.id}",
                    type="diary",
                    title=diary.title,
                    content=diary.content,
                    time=diary.created_at.strftime("%H:%M"),
                    timestamp=int(diary.created_at.timestamp() * 1000)
                ))

        # 获取饮食偏离事件（使用 occurred_at 作为事件时间）
        if type in ["all", "diet"]:
            system = DietService.get_or_create_fuel_system(db, user.id)
            deviations = db.query(MealDeviation).filter(
                MealDeviation.system_id == system.id
            ).all()

            for deviation in deviations:
                events.append(TimelineEventItem(
                    id=f"diet_{deviation.id}",
                    type="diet",
                    title="饮食偏离记录",
                    content=deviation.description,
                    time=deviation.occurred_at.strftime("%H:%M"),
                    timestamp=int(deviation.occurred_at.timestamp() * 1000)
                ))

        # 按时间戳降序排序（最新事件在前）
        events.sort(key=lambda x: x.timestamp, reverse=True)

        # 分页
        total_events = len(events)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_events = events[start_idx:end_idx]

        # 按日期分组
        grouped = TimelineService._group_by_date(page_events)

        response = TimelineResponse(
            timeline=grouped,
            total_events=total_events,
            has_more=end_idx < total_events
        )

        return response.model_dump(), 200

    @staticmethod
    def _group_by_date(events: list) -> list[TimelineDateGroup]:
        """
        按日期分组事件

        Args:
            events: TimelineEventItem 列表

        Returns:
            TimelineDateGroup 列表，按日期降序排列
        """
        groups = {}
        for event in events:
            # 从时间戳还原日期
            dt = datetime.fromtimestamp(event.timestamp / 1000)
            # 日期格式: YYYY年MM月DD日
            date_str = dt.strftime("%Y年%m月%d日")

            if date_str not in groups:
                groups[date_str] = []
            groups[date_str].append(event)

        # 转换为 TimelineDateGroup 列表，按日期降序
        result = [
            TimelineDateGroup(date=date, events=group_events)
            for date, group_events in sorted(
                groups.items(),
                key=lambda x: x[0],
                reverse=True
            )
        ]
        return result
