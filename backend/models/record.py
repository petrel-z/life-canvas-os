"""每日记录模型（已弃用，建议使用 SystemLog 替代）"""
from sqlalchemy import Column, Integer, Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.db.base import Base


class DailyRecord(Base):
    """每日记录表（备用）"""
    __tablename__ = "daily_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    system_id = Column(Integer, ForeignKey("systems.id"))

    date = Column(Date, index=True)
    score = Column(Integer)  # 1-10 分
    note = Column(String, nullable=True)  # 简短备注

    # 关系属性，方便查询
    user = relationship("User")
    system = relationship("System")

    # 联合唯一约束：同一个用户、同一天、同一个系统只能有一条记录
    __table_args__ = (
        UniqueConstraint('user_id', 'system_id', 'date', name='uq_user_system_date'),
    )
