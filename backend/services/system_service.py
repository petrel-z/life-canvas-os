"""
系统服务 - 八大系统公共业务逻辑

支持功能：
- 八大系统评分摘要
"""
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from backend.models.dimension import System, SYSTEM_TYPES
from backend.models.user import User
from backend.schemas.common import error_response, success_response


class SystemService:
    """系统服务类（八大系统公共功能）"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取默认用户"""
        return db.query(User).first()

    @staticmethod
    def get_all_systems_scores(db: Session) -> Tuple[dict, int]:
        """
        获取八大系统的评分摘要

        Returns:
            (response_data, status_code)
        """
        user = SystemService.get_user(db)
        if not user:
            return error_response(message="用户不存在", code=404), 404

        # 获取所有系统
        systems = db.query(System).filter(System.user_id == user.id).all()

        # 构建系统评分映射
        system_map = {s.type: s for s in systems}

        # 构建响应数据
        scores = []
        total_score = 0
        valid_count = 0

        for system_type in SYSTEM_TYPES:
            system = system_map.get(system_type)
            if system:
                scores.append({
                    "type": system_type,
                    "score": system.score
                })
                total_score += system.score
                valid_count += 1
            else:
                scores.append({
                    "type": system_type,
                    "score": 100  # 默认分数
                })
                total_score += 100
                valid_count += 1

        # 计算平均分
        average_score = round(total_score / valid_count, 1) if valid_count > 0 else 0

        return success_response(
            data={
                "systems": scores,
                "average_score": average_score,
                "total_systems": len(SYSTEM_TYPES)
            },
            message="获取系统评分成功"
        ), 200