from typing import Any
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import declared_attr

class Base(DeclarativeBase):
    model_config = {"protected_namespaces": ()}

    id: Any

    # 自动生成表名：将类名 UserConfig 转换为 user_config
    @declared_attr
    def __tablename__(cls) -> str:
        # 将驼峰命名转换为蛇形命名
        import re
        snake_case_name = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', cls.__name__).lower()
        # 添加复数形式
        return snake_case_name + "s"  # 如 UserConfig -> user_configs
