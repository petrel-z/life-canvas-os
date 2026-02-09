"""
AI 洞察服务 - AI 洞察生成业务逻辑
"""
import json
from typing import Optional, Tuple, List, Literal, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import httpx

from backend.models.user import User
from backend.models.dimension import System
from backend.models.insight import Insight
from backend.schemas.insight import (
    InsightGenerateRequest,
    InsightGenerateResponse,
    InsightResponse,
)
from backend.schemas.common import error_response, PaginatedResponse
from backend.services.user_service import UserService


class InsightService:
    """AI 洞察服务类"""

    @staticmethod
    def get_user(db: Session) -> Optional[User]:
        """获取默认用户"""
        return db.query(User).first()

    @staticmethod
    def get_system_scores(db: Session, user_id: int) -> dict:
        """获取当前系统评分"""
        systems = db.query(System).filter(System.user_id == user_id).all()
        return {s.type: s.score for s in systems}

    @staticmethod
    def get_latest_insight(db: Session, user_id: int) -> Optional[Insight]:
        """获取最新洞察"""
        return db.query(Insight).filter(
            Insight.user_id == user_id
        ).order_by(Insight.generated_at.desc()).first()

    @staticmethod
    async def call_deepseek_api(api_key: str, system_scores: dict) -> List[Dict[str, Any]]:
        """调用 DeepSeek API 生成洞察"""
        url = "https://api.deepseek.com/v1/chat/completions"

        # 构建 prompt
        scores_text = "\n".join([f"{k}: {v}" for k, v in system_scores.items()])

        prompt = f"""基于以下八维系统评分，生成 3 条洞察建议：

系统评分：
{scores_text}

请返回 JSON 格式，包含 3 条洞察，每条包含 category（类别）和 insight（洞察内容）：
1. celebration（庆祝）：针对得分最高的维度
2. warning（警告）：针对得分最低的维度
3. action（行动）：提供具体的改进建议

返回格式：
[
  {{"category": "饮食", "insight": "最近饮食一致性较高，继续保持"}},
  {{"category": "运动", "insight": "运动量偏低，建议增加有氧运动"}},
  {{"category": "行动建议", "insight": "每天运动 30 分钟可显著改善体质"}}
]

只返回 JSON 数组，不要有其他内容。"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

        # 解析响应
        content = result["choices"][0]["message"]["content"]

        # 尝试解析 JSON
        try:
            insights = json.loads(content)
            if not isinstance(insights, list):
                insights = [{"category": "综合", "insight": content}]
        except json.JSONDecodeError:
            insights = [{"category": "综合", "insight": content}]

        return insights

    @staticmethod
    async def call_doubao_api(api_key: str, system_scores: dict) -> List[Dict[str, Any]]:
        """调用豆包 API 生成洞察"""
        # 豆包 API 实现类似
        # TODO: 实现豆包 API 调用
        raise NotImplementedError("豆包 API 尚未实现")

    @staticmethod
    async def call_openai_api(api_key: str, system_scores: dict) -> List[Dict[str, Any]]:
        """调用 OpenAI API 生成洞察"""
        url = "https://api.openai.com/v1/chat/completions"

        scores_text = "\n".join([f"{k}: {v}" for k, v in system_scores.items()])

        prompt = f"""Based on the following system scores, generate 3 insights:

System Scores:
{scores_text}

Return a JSON array with 3 insights, each containing 'category' and 'insight':
1. celebration: for the highest score
2. warning: for the lowest score
3. action: specific improvement suggestion

Return only JSON array, no other content."""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

        content = result["choices"][0]["message"]["content"]

        try:
            insights = json.loads(content)
            if not isinstance(insights, list):
                insights = [{"category": "General", "insight": content}]
        except json.JSONDecodeError:
            insights = [{"category": "General", "insight": content}]

        return insights

    @staticmethod
    async def generate_insight(db: Session, request: InsightGenerateRequest) -> Tuple[dict, int]:
        """
        生成洞察

        Returns:
            (response_data, status_code)
        """
        user = InsightService.get_user(db)

        # 检查是否配置了 AI
        if not user or not user.ai_config:
            return error_response(
                message="AI 服务未配置",
                code=424,
                data={"hint": "请先在设置中配置 AI 服务"}
            ), 424

        provider = user.ai_config.get("provider")
        encrypted_key = user.ai_config.get("api_key")

        if not encrypted_key:
            return error_response(
                message="API Key 未配置",
                code=424
            ), 424

        # 解密 API Key
        try:
            api_key = UserService.decrypt_api_key(encrypted_key)
        except Exception:
            return error_response(
                message="API Key 解密失败",
                code=500
            ), 500

        # 获取当前系统评分
        system_scores = InsightService.get_system_scores(db, user.id)

        # 检查是否强制重新生成
        if not request.force:
            latest_insight = InsightService.get_latest_insight(db, user.id)
            # 如果最近 24 小时内已生成，直接返回
            if latest_insight:
                time_diff = datetime.now() - latest_insight.generated_at
                if time_diff < timedelta(hours=24):
                    return InsightResponse.model_validate(latest_insight).model_dump(), 200

        # 调用 AI API
        try:
            if provider == "deepseek":
                insights = await InsightService.call_deepseek_api(api_key, system_scores)
            elif provider == "doubao":
                insights = await InsightService.call_doubao_api(api_key, system_scores)
            elif provider == "openai":
                insights = await InsightService.call_openai_api(api_key, system_scores)
            else:
                return error_response(
                    message=f"未知的 AI 提供商: {provider}",
                    code=400
                ), 400
        except httpx.HTTPStatusError as e:
            return error_response(
                message=f"AI API 调用失败: {e.response.status_code}",
                code=502
            ), 502
        except Exception as e:
            # AI 调用失败，返回默认建议
            insights = [
                {"category": "系统提示", "insight": "AI 服务暂时不可用，请稍后再试"},
            ]

        # 保存洞察
        insight = Insight(
            user_id=user.id,
            content=insights,
            system_scores=system_scores,
            provider_used=provider
        )

        db.add(insight)
        db.commit()
        db.refresh(insight)

        return InsightGenerateResponse(
            id=insight.id,
            user_id=insight.user_id,
            content=insight.content,
            system_scores=insight.system_scores,
            provider_used=insight.provider_used,
            generated_at=insight.generated_at
        ).model_dump(), 200

    @staticmethod
    def get_insights(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        sort_by: str = "generated_at",
        sort_order: Literal["asc", "desc"] = "desc"
    ) -> Tuple[dict, int]:
        """
        获取洞察历史

        Returns:
            (response_data, status_code)
        """
        user = InsightService.get_user(db)

        # 构建查询
        query = db.query(Insight).filter(Insight.user_id == user.id)

        # 排序
        order_column = getattr(Insight, sort_by, Insight.generated_at)
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())

        # 分页
        total = query.count()
        offset = (page - 1) * page_size
        insights = query.offset(offset).limit(page_size).all()

        items = [InsightResponse.model_validate(i) for i in insights]
        paginated = PaginatedResponse.create(items, total, page, page_size)

        return paginated.model_dump(), 200

    @staticmethod
    def get_latest_insight_endpoint(db: Session) -> Tuple[dict, int]:
        """
        获取最新洞察

        Returns:
            (response_data, status_code)
        """
        user = InsightService.get_user(db)

        insight = InsightService.get_latest_insight(db, user.id)

        if not insight:
            return error_response(
                message="暂无洞察数据",
                code=404,
                data={"hint": "请先生成洞察"}
            ), 404

        return InsightResponse.model_validate(insight).model_dump(), 200
