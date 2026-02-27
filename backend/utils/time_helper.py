"""时间戳处理工具"""
from datetime import datetime
from typing import Any, Dict


def datetime_to_timestamp(dt: datetime) -> int:
    """将 datetime 对象转换为毫秒级 Unix 时间戳

    Args:
        dt: datetime 对象

    Returns:
        毫秒级 Unix 时间戳
    """
    return int(dt.timestamp() * 1000)


def timestamp_to_datetime(ts: int) -> datetime:
    """将毫秒级 Unix 时间戳转换为 datetime 对象

    Args:
        ts: 毫秒级 Unix 时间戳

    Returns:
        datetime 对象
    """
    return datetime.fromtimestamp(ts / 1000)


def current_timestamp() -> int:
    """获取当前时间戳（毫秒）

    Returns:
        当前时间的毫秒级 Unix 时间戳
    """
    return int(datetime.now().timestamp() * 1000)
