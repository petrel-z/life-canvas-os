# Life Canvas OS 详细开发步骤

> 版本：v1.0
> 创建日期：2026-02-05
> 基于项目当前状态：约 7% 完成

本文档提供可执行的开发步骤，按照优先级和依赖关系排序，每个步骤都包含具体的实现内容。

---

## 📋 开发阶段概览

```
Phase 0: 基础设施 ✅ (已完成)
├── Electron + React 框架
├── Python 后端框架
└── 基础目录结构

Phase 1: 数据层 (数据库 + Models) 🔜
├── 数据库模型设计
├── 数据库初始化
└── Pydantic Schemas

Phase 2: 后端 API 开发 🔜
├── 核心模块
├── API 路由
└── 业务逻辑

Phase 3: 前端 UI 基础设施 🔜
├── UI 组件库
├── 布局组件
└── 状态管理

Phase 4: 核心功能开发 🔜
├── PIN 认证
├── 用户配置
└── 子系统 CRUD

Phase 5: 高级功能 🔜
├── AI 洞察
├── 用户日记
└── 数据可视化

Phase 6: 优化与发布 🔜
├── 性能优化
├── 打包配置
└── 自动更新
```

---

## Phase 1: 数据层开发（后端优先）

> **目标**：建立数据库基础设施，定义数据模型和验证 Schema
> **预计时间**：3-5 天
> **前置条件**：Python 3.12+ 已安装

---

### Step 1.1: 安装 Python 依赖

**文件**：`backend/requirements.txt`

```bash
# 进入后端目录
cd /Users/petrel/electron-app/life-canvas-os

# 创建 requirements.txt
cat > backend/requirements.txt << 'EOF'
# FastAPI 核心依赖
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0

# 数据库
sqlalchemy==2.0.23

# 安全与加密
passlib[bcrypt]==1.7.4
cryptography==41.0.7

# AI SDK
openai==1.3.5

# 工具
python-dotenv==1.0.0
httpx==0.25.2

# 开发工具
pytest==7.4.3
pytest-asyncio==0.21.1
EOF

# 安装依赖
source venv/bin/activate
pip install -r backend/requirements.txt
```

**验证**：
```bash
python -c "import fastapi; import sqlalchemy; import pydantic; print('✅ 依赖安装成功')"
```

---

### Step 1.2: 创建数据库配置模块

**文件**：`backend/core/database.py`

```python
"""
数据库配置和连接管理
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pathlib import Path
import os
import sys

# 获取用户数据目录
if os.name == 'nt':  # Windows
    DATA_DIR = Path(os.environ['APPDATA']) / 'Life Canvas OS'
elif os.name == 'posix':  # macOS / Linux
    if sys.platform == 'darwin':
        DATA_DIR = Path.home() / 'Library' / 'Application Support' / 'Life Canvas OS'
    else:
        DATA_DIR = Path.home() / '.config' / 'life-canvas-os'

# 确保数据目录存在
DATA_DIR.mkdir(parents=True, exist_ok=True)

# 数据库文件路径
DB_PATH = DATA_DIR / 'data.db'

# SQLite 连接字符串
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# 创建引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite 多线程必需
    echo=False  # 生产环境设为 False，开发时可设为 True 查看 SQL
)

# 创建 SessionLocal 工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 类用于模型继承
class Base(DeclarativeBase):
    """所有模型的基类"""
    pass

def get_db():
    """
    获取数据库会话的依赖注入函数
    用于 FastAPI 路由的 Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    """
    初始化数据库，创建所有表
    """
    from backend.models import user_profile, user_settings, ai_config, system, journal
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database initialized at: {DB_PATH}")
```

**验证**：
```bash
python -c "from backend.core.database import engine, DATA_DIR; print(f'Database path: {DATA_DIR / \"data.db\"}')"
```

---

### Step 1.3: 创建用户模型

**文件**：`backend/models/user.py`

```python
"""
用户相关数据模型
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class UserProfile(Base):
    """用户身份信息表"""
    __tablename__ = 'user_profile'

    id = Column(Integer, primary_key=True, autoincrement=True)
    pin_hash = Column(String(255), nullable=False, default='')  # bcrypt 哈希
    display_name = Column(String(100), nullable=False, default='User')
    birthday = Column(String(10))  # YYYY-MM-DD
    mbti = Column(String(4))  # MBTI 类型
    values = Column(Text)  # JSON 数组格式
    life_expectancy = Column(Integer, default=85)
    locked_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    settings = relationship("UserSettings", back_populates="profile", uselist=False)
    ai_config = relationship("AIConfig", back_populates="profile", uselist=False)

class UserSettings(Base):
    """用户配置信息表"""
    __tablename__ = 'user_settings'

    user_id = Column(Integer, ForeignKey('user_profile.id', ondelete='CASCADE'), primary_key=True, default=1)
    theme = Column(String(10), default='light')  # light, dark, auto
    language = Column(String(10), default='zh-CN')
    auto_save_enabled = Column(Boolean, default=True)
    auto_save_interval = Column(Integer, default=60)
    notification_enabled = Column(Boolean, default=True)
    notification_time = Column(String(5), default='09:00')
    show_year_progress = Column(Boolean, default=True)
    show_weekday = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    profile = relationship("UserProfile", back_populates="settings")

class AIConfig(Base):
    """AI 配置表"""
    __tablename__ = 'ai_config'

    user_id = Column(Integer, ForeignKey('user_profile.id', ondelete='CASCADE'), primary_key=True, default=1)
    provider = Column(String(20), nullable=False)  # deepseek, doubao
    api_key_enc = Column(Text, nullable=False)  # AES-256-GCM 加密
    model_name = Column(String(100))  # 可选的自定义模型名
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    profile = relationship("UserProfile", back_populates="ai_config")
```

---

### Step 1.4: 创建系统模型

**文件**：`backend/models/system.py`

```python
"""
子系统数据模型
"""
from sqlalchemy import Column, Integer, String, Text, Float, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class SystemBase(Base):
    """子系统公共字段表"""
    __tablename__ = 'systems_base'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_profile.id', ondelete='CASCADE'), default=1)
    type = Column(String(20), nullable=False)  # FUEL, PHYSICAL, INTELLECTUAL, OUTPUT, RECOVERY, ASSET, CONNECTION, ENVIRONMENT
    score = Column(Integer, default=50)  # 0-100
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    fuel = relationship("SystemFuel", back_populates="base", uselist=False)
    physical = relationship("SystemPhysical", back_populates="base", uselist=False)
    intellectual = relationship("SystemIntellectual", back_populates="base", uselist=False)
    output = relationship("SystemOutput", back_populates="base", uselist=False)
    recovery = relationship("SystemRecovery", back_populates="base", uselist=False)
    asset = relationship("SystemAsset", back_populates="base", uselist=False)
    connection = relationship("SystemConnection", back_populates="base", uselist=False)
    environment = relationship("SystemEnvironment", back_populates="base", uselist=False)

class SystemFuel(Base):
    """饮食系统专属字段"""
    __tablename__ = 'systems_fuel'

    system_id = Column(Integer, ForeignKey('systems_base.id', ondelete='CASCADE'), primary_key=True)
    consistency = Column(Integer, default=0)  # 0-100
    baseline_breakfast = Column(Text)  # JSON
    baseline_lunch = Column(Text)  # JSON
    baseline_dinner = Column(Text)  # JSON
    baseline_snacks = Column(Text)  # JSON
    last_deviation = Column(Text)  # JSON

    base = relationship("SystemBase", back_populates="fuel")

class SystemPhysical(Base):
    """运动系统专属字段"""
    __tablename__ = 'systems_physical'

    system_id = Column(Integer, ForeignKey('systems_base.id', ondelete='CASCADE'), primary_key=True)
    maintenance_index = Column(Integer, default=0)  # 0-100
    weekly_plan = Column(Text)  # JSON
    weekly_progress = Column(Integer, default=0)  # 0-100
    last_workout_at = Column(TIMESTAMP)
    total_workout_hours = Column(Float, default=0.0)

    base = relationship("SystemBase", back_populates="physical")

# ... 其他系统模型类似，完整实现见文档

class Log(Base):
    """系统日志表"""
    __tablename__ = 'logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    system_id = Column(Integer, ForeignKey('systems_base.id', ondelete='CASCADE'))
    label = Column(String(100), nullable=False)
    value = Column(Text)
    metadata = Column(Text)  # JSON
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

class ActionItem(Base):
    """行动项表"""
    __tablename__ = 'action_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    system_id = Column(Integer, ForeignKey('systems_base.id', ondelete='CASCADE'))
    text = Column(Text, nullable=False)
    completed = Column(Integer, default=0)  # 0 or 1
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
```

---

### Step 1.5: 创建日记模型

**文件**：`backend/models/journal.py`

```python
"""
用户日记数据模型
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from datetime import datetime
from backend.core.database import Base

class UserJournal(Base):
    """用户日记表"""
    __tablename__ = 'user_journal'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_profile.id', ondelete='CASCADE'), default=1)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    mood = Column(String(10))  # great, good, neutral, bad, terrible
    tags = Column(Text)  # JSON 数组
    related_system = Column(String(20))  # 关联的系统类型
    is_private = Column(Integer, default=1)  # 0 or 1
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

class Insight(Base):
    """AI 洞察表"""
    __tablename__ = 'insights'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_profile.id', ondelete='CASCADE'), default=1)
    content = Column(Text, nullable=False)  # JSON 数组
    system_scores = Column(Text)  # JSON
    provider_used = Column(String(20))
    generated_at = Column(TIMESTAMP, default=datetime.utcnow)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
```

---

### Step 1.6: 创建 Pydantic Schemas

**文件**：`backend/schemas/user.py`

```python
"""
用户相关的 Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserProfileBase(BaseModel):
    """用户基础 Schema"""
    display_name: str = "User"
    birthday: Optional[str] = None
    mbti: Optional[str] = None
    values: Optional[str] = None
    life_expectancy: int = 85

class UserProfileCreate(UserProfileBase):
    """创建用户 Schema"""
    pin: str  # 6 位数字

class UserProfileUpdate(BaseModel):
    """更新用户 Schema"""
    display_name: Optional[str] = None
    birthday: Optional[str] = None
    mbti: Optional[str] = None
    values: Optional[str] = None
    life_expectancy: Optional[int] = None

class UserProfileResponse(UserProfileBase):
    """用户响应 Schema"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PINSetup(BaseModel):
    """设置 PIN Schema"""
    pin: str = Field(..., pattern=r"^\d{6}$", description="6位数字PIN码")

class PINVerify(BaseModel):
    """验证 PIN Schema"""
    pin: str = Field(..., pattern=r"^\d{6}$", description="6位数字PIN码")

class PINChange(BaseModel):
    """修改 PIN Schema"""
    old_pin: str = Field(..., pattern=r"^\d{6}$")
    new_pin: str = Field(..., pattern=r"^\d{6}$")
```

**文件**：`backend/schemas/system.py`

```python
"""
系统相关的 Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SystemBase(BaseModel):
    """系统基础 Schema"""
    type: str = Field(..., pattern=r"^(FUEL|PHYSICAL|INTELLECTUAL|OUTPUT|RECOVERY|ASSET|CONNECTION|ENVIRONMENT)$")
    score: int = Field(default=50, ge=0, le=100)

class SystemCreate(SystemBase):
    """创建系统 Schema"""
    pass

class SystemUpdate(BaseModel):
    """更新系统评分 Schema"""
    score: int = Field(..., ge=0, le=100)

class SystemResponse(SystemBase):
    """系统响应 Schema"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SystemDetailResponse(SystemResponse):
    """系统详情响应 Schema（包含专属字段）"""
    # 专属字段根据 type 不同而不同
    details: Optional[dict] = None
```

---

### Step 1.7: 创建数据库初始化脚本

**文件**：`backend/db/init_db.py`

```python
"""
数据库初始化脚本
"""
from sqlalchemy.orm import Session
from backend.core.database import engine, SessionLocal, Base
from backend.models import user_profile, user_settings, ai_config, system, journal
import sys

def init_database():
    """初始化数据库，创建所有表和默认数据"""
    print("🚀 Initializing database...")

    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")

    # 创建会话
    db = SessionLocal()

    try:
        # 检查是否已有用户
        existing_user = db.query(user_profile.UserProfile).first()
        if existing_user:
            print("ℹ️  Database already initialized")
            return

        # 1. 插入默认用户
        default_user = user_profile.UserProfile(
            id=1,
            pin_hash='',  # 空哈希表示未设置 PIN
            display_name='User'
        )
        db.add(default_user)
        db.flush()
        print("✅ Default user created")

        # 2. 插入默认设置
        default_settings = user_settings.UserSettings(user_id=1)
        db.add(default_settings)
        print("✅ Default settings created")

        # 3. 插入 8 个默认系统
        system_types = [
            'FUEL', 'PHYSICAL', 'INTELLECTUAL', 'OUTPUT',
            'RECOVERY', 'ASSET', 'CONNECTION', 'ENVIRONMENT'
        ]

        for sys_type in system_types:
            # 创建公共字段
            base_system = system.SystemBase(
                user_id=1,
                type=sys_type,
                score=50
            )
            db.add(base_system)
            db.flush()  # 获取 ID

            # 根据类型创建专属字段
            if sys_type == 'FUEL':
                db.add(system.SystemFuel(system_id=base_system.id))
            elif sys_type == 'PHYSICAL':
                db.add(system.SystemPhysical(system_id=base_system.id))
            # ... 其他系统

        print(f"✅ Created {len(system_types)} systems")

        # 提交所有更改
        db.commit()
        print("🎉 Database initialization completed!")

    except Exception as e:
        db.rollback()
        print(f"❌ Initialization failed: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
```

**运行初始化**：
```bash
source venv/bin/activate
python -m backend.db.init_db
```

**验证**：
```bash
# 检查数据库文件是否创建
ls -lh ~/Library/Application\ Support/Life\ Canvas\ OS/data.db  # macOS
# 或
ls -lh ~/.config/life-canvas-os/data.db  # Linux
```

---

### Step 1.8: 创建模型包的 __init__.py

**文件**：`backend/models/__init__.py`

```python
"""
模型包初始化
导入所有模型，方便其他模块使用
"""
from backend.models.user import UserProfile, UserSettings, AIConfig
from backend.models.system import SystemBase, SystemFuel, SystemPhysical, Log, ActionItem
from backend.models.journal import UserJournal, Insight

__all__ = [
    # User models
    "UserProfile",
    "UserSettings",
    "AIConfig",
    # System models
    "SystemBase",
    "SystemFuel",
    "SystemPhysical",
    "Log",
    "ActionItem",
    # Journal models
    "UserJournal",
    "Insight",
]
```

**文件**：`backend/schemas/__init__.py`

```python
"""
Schemas 包初始化
"""
from backend.schemas.user import (
    UserProfileBase,
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    PINSetup,
    PINVerify,
    PINChange,
)
from backend.schemas.system import (
    SystemBase,
    SystemCreate,
    SystemUpdate,
    SystemResponse,
    SystemDetailResponse,
)

__all__ = [
    # User schemas
    "UserProfileBase",
    "UserProfileCreate",
    "UserProfileUpdate",
    "UserProfileResponse",
    "PINSetup",
    "PINVerify",
    "PINChange",
    # System schemas
    "SystemBase",
    "SystemCreate",
    "SystemUpdate",
    "SystemResponse",
    "SystemDetailResponse",
]
```

---

## Phase 2: 后端 API 开发

> **目标**：实现核心业务逻辑和 API 接口
> **预计时间**：5-7 天
> **前置条件**：Phase 1 完成

---

### Step 2.1: 创建安全模块

**文件**：`backend/core/security.py`

```python
"""
安全模块：PIN 哈希与验证、API Key 加密
"""
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64
import hashlib

# PIN 哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_pin(pin: str) -> str:
    """对 PIN 进行哈希"""
    return pwd_context.hash(pin)

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """验证 PIN"""
    return pwd_context.verify(plain_pin, hashed_pin)

# API Key 加密（简化版本，生产环境应使用系统 Keychain）
class EncryptionService:
    """加密服务"""

    @staticmethod
    def generate_key() -> bytes:
        """生成加密密钥"""
        # 在生产环境中，这应该存储在系统 Keychain 中
        return Fernet.generate_key()

    @staticmethod
    def encrypt_api_key(api_key: str, key: bytes) -> str:
        """加密 API Key"""
        f = Fernet(key)
        encrypted = f.encrypt(api_key.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    @staticmethod
    def decrypt_api_key(encrypted_key: str, key: bytes) -> str:
        """解密 API Key"""
        f = Fernet(key)
        decoded = base64.urlsafe_b64decode(encrypted_key.encode())
        decrypted = f.decrypt(decoded)
        return decrypted.decode()
```

---

### Step 2.2: 实现 PIN 认证 API

**文件**：`backend/api/pin.py`

```python
"""
PIN 认证 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.models.user import UserProfile
from backend.schemas.user import PINSetup, PINVerify, PINChange
from backend.core.security import hash_pin, verify_pin

router = APIRouter()

@router.post("/setup")
async def setup_pin(
    pin_data: PINSetup,
    db: Session = Depends(get_db)
):
    """
    设置 PIN 码（首次使用）
    """
    # 获取用户
    user = db.query(UserProfile).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 检查是否已设置 PIN
    if user.pin_hash and user.pin_hash != "":
        raise HTTPException(
            status_code=400,
            detail="PIN already set. Use change endpoint instead."
        )

    # 哈希并保存 PIN
    user.pin_hash = hash_pin(pin_data.pin)
    db.commit()

    return {"success": True, "message": "PIN set successfully"}

@router.post("/verify")
async def verify_pin_endpoint(
    pin_data: PINVerify,
    db: Session = Depends(get_db)
):
    """
    验证 PIN 码
    """
    # 获取用户
    user = db.query(UserProfile).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 检查是否已设置 PIN
    if not user.pin_hash or user.pin_hash == "":
        raise HTTPException(
            status_code=400,
            detail="PIN not set. Please set up PIN first."
        )

    # 验证 PIN
    if not verify_pin(pin_data.pin, user.pin_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid PIN"
        )

    return {"success": True, "message": "PIN verified"}

@router.post("/change")
async def change_pin(
    pin_data: PINChange,
    db: Session = Depends(get_db)
):
    """
    修改 PIN 码
    """
    # 获取用户
    user = db.query(UserProfile).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 验证旧 PIN
    if not verify_pin(pin_data.old_pin, user.pin_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid old PIN"
        )

    # 更新为新 PIN
    user.pin_hash = hash_pin(pin_data.new_pin)
    db.commit()

    return {"success": True, "message": "PIN changed successfully"}

@router.post("/lock")
async def lock_app(db: Session = Depends(get_db)):
    """
    锁定应用
    """
    from datetime import datetime
    user = db.query(UserProfile).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.locked_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "App locked"}
```

---

### Step 2.3: 实现系统数据 API

**文件**：`backend/api/system.py`

```python
"""
系统数据 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.core.database import get_db
from backend.models.system import SystemBase, SystemFuel, SystemPhysical
from backend.schemas.system import SystemCreate, SystemUpdate, SystemResponse, SystemDetailResponse

router = APIRouter()

@router.get("/", response_model=List[SystemResponse])
async def get_systems(db: Session = Depends(get_db)):
    """获取所有系统"""
    systems = db.query(SystemBase).all()
    return systems

@router.get("/{system_type}", response_model=SystemDetailResponse)
async def get_system(system_type: str, db: Session = Depends(get_db)):
    """获取单个系统详情"""
    system = db.query(SystemBase).filter(SystemBase.type == system_type).first()
    if not system:
        raise HTTPException(status_code=404, detail="System not found")

    # 获取专属字段
    details = None
    if system_type == 'FUEL':
        fuel = db.query(SystemFuel).filter(SystemFuel.system_id == system.id).first()
        if fuel:
            details = {
                "consistency": fuel.consistency,
                "baseline_breakfast": fuel.baseline_breakfast,
                "baseline_lunch": fuel.baseline_lunch,
                "baseline_dinner": fuel.baseline_dinner,
            }
    # ... 其他系统

    return SystemDetailResponse(
        id=system.id,
        user_id=system.user_id,
        type=system.type,
        score=system.score,
        created_at=system.created_at,
        updated_at=system.updated_at,
        details=details
    )

@router.patch("/{system_type}/score")
async def update_system_score(
    system_type: str,
    score_data: SystemUpdate,
    db: Session = Depends(get_db)
):
    """更新系统评分"""
    system = db.query(SystemBase).filter(SystemBase.type == system_type).first()
    if not system:
        raise HTTPException(status_code=404, detail="System not found")

    system.score = score_data.score
    db.commit()

    return {"success": True, "new_score": system.score}
```

---

### Step 2.4: 更新主应用入口

**文件**：`backend/main.py`

```python
"""
FastAPI 主应用入口
支持双模式：开发环境 HTTP，生产环境 IPC
"""
import sys
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import pin, system
from backend.core.health import router as health_router

app = FastAPI(title="Life Canvas OS API", version="0.0.1")

# CORS 中间件（开发环境）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(health_router, tags=["health"])
app.include_router(pin.router, prefix="/api/pin", tags=["pin"])
app.include_router(system.router, prefix="/api/systems", tags=["systems"])

# IPC 模式支持
if __name__ == "__main__":
    if '--dev' in sys.argv:
        # 开发模式：启动 HTTP 服务器
        import uvicorn
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
    else:
        # 生产模式：IPC 通信
        # 实现 IPC 循环（详见 DESIGN.md）
        pass
```

---

## Phase 3: 前端 UI 基础设施

> **目标**：建立前端 UI 组件库和布局
> **预计时间**：3-4 天
> **前置条件**：后端 API 可用

---

### Step 3.1: 安装前端依赖

```bash
cd /Users/petrel/electron-app/life-canvas-os

# 安装必需的依赖
pnpm add lucide-react  # 图标库
pnpm add recharts       # 图表库

# 其他依赖保持最小化，按需安装
```

---

### Step 3.2: 创建 UI 工具函数

**文件**：`src/renderer/lib/utils.ts`（已存在，确保内容正确）

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### Step 3.3: 创建基础 UI 组件

#### Button 组件

**文件**：`src/renderer/components/ui/button.tsx`

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

#### Input 组件

**文件**：`src/renderer/components/ui/input.tsx`

```typescript
import * as React from 'react'
import { cn } from '~/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

#### Card 组件

**文件**：`src/renderer/components/ui/card.tsx`

```typescript
import * as React from 'react'
import { cn } from '~/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

---

### Step 3.4: 创建布局组件

#### Sidebar 组件

**文件**：`src/renderer/components/layout/sidebar.tsx`

```typescript
import { Home, Brain, Clock, Settings, BookOpen } from 'lucide-react'
import { cn } from '~/lib/utils'

interface SidebarProps {
  currentPath?: string
  onNavigate?: (path: string) => void
}

const navItems = [
  { icon: Home, label: '全局画布', path: '/canvas' },
  { icon: Brain, label: 'AI 洞察', path: '/insights' },
  { icon: Clock, label: '时间轴', path: '/history' },
  { icon: BookOpen, label: '用户日记', path: '/journal' },
  { icon: Settings, label: '系统设置', path: '/settings' },
]

export function Sidebar({ currentPath = '/canvas', onNavigate }: SidebarProps) {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      window.location.hash = path
    }
  }

  return (
    <div className="w-64 bg-background border-r border-border h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold">Life Canvas OS</h1>
        <p className="text-sm text-muted-foreground mt-1">个人成长操作系统</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path

          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          v0.0.1 • 开发中
        </p>
      </div>
    </div>
  )
}
```

---

### Step 3.5: 创建主布局组件

**文件**：`src/renderer/components/layout/app-layout.tsx`

```typescript
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { useEffect, useState } from 'react'

export function AppLayout() {
  const [currentPath, setCurrentPath] = useState('/canvas')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/canvas'
      setCurrentPath(hash)
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // 初始化

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPath={currentPath} />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

---

### Step 3.6: 更新路由配置

**文件**：`src/renderer/routes.tsx`

```typescript
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "~/components/layout/app-layout"
import { PlaceholderPage } from "~/pages/placeholder-page"

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/canvas" replace />} />
          <Route path="canvas" element={<PlaceholderPage name="全局画布" />} />
          <Route path="insights" element={<PlaceholderPage name="AI 洞察" />} />
          <Route path="history" element={<PlaceholderPage name="时间轴审计" />} />
          <Route path="settings" element={<PlaceholderPage name="系统设置" />} />
          <Route path="journal" element={<PlaceholderPage name="用户日记" />} />
          <Route path="system/:type" element={<PlaceholderPage name="子系统详情" />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
```

---

## Phase 4: 核心功能实现

> **目标**：实现 PIN 认证和系统 CRUD
> **预计时间**：4-5 天
> **前置条件**：Phase 2、Phase 3 完成

---

### Step 4.1: 创建 PIN 设置页面

**文件**：`src/renderer/pages/pin-setup-page.tsx`

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Alert } from '~/components/ui/alert'

export function PINSetupPage() {
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证
    if (pin.length !== 6) {
      setError('PIN 必须是 6 位数字')
      return
    }

    if (pin !== confirmPin) {
      setError('两次输入的 PIN 不一致')
      return
    }

    setLoading(true)

    try {
      // 调用 API
      const response = await fetch('http://127.0.0.1:8000/api/pin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (response.ok) {
        // 成功，跳转到主页
        navigate('/canvas')
      } else {
        setError(data.detail || '设置失败')
      }
    } catch (err) {
      setError('网络错误，请检查 Python 后端是否运行')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>设置 PIN 码</CardTitle>
          <CardDescription>
            请设置一个 6 位数字的 PIN 码用于锁定应用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">PIN 码</label>
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入 6 位数字"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">确认 PIN 码</label>
              <Input
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="再次输入 PIN 码"
                className="mt-1"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '设置中...' : '完成设置'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Step 4.2: 实现系统卡片组件

**文件**：`src/renderer/components/canvas/system-card.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Plus, Minus } from 'lucide-react'
import { useState } from 'react'

interface SystemCardProps {
  name: string
  score: number
  description: string
  onScoreChange?: (newScore: number) => void
}

export function SystemCard({ name, score, description, onScoreChange }: SystemCardProps) {
  const [localScore, setLocalScore] = useState(score)

  const handleIncrement = () => {
    const newScore = Math.min(100, localScore + 5)
    setLocalScore(newScore)
    onScoreChange?.(newScore)
  }

  const handleDecrement = () => {
    const newScore = Math.max(0, localScore - 5)
    setLocalScore(newScore)
    onScoreChange?.(newScore)
  }

  const getScoreColor = () => {
    if (localScore >= 80) return 'text-green-500'
    if (localScore >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{name}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold {getScoreColor()}">
            {localScore}
          </div>

          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              size="sm"
              onClick={handleDecrement}
              disabled={localScore === 0}
            >
              <Minus className="w-4 h-4" />
            </Button>

            <Button
              size="icon"
              variant="outline"
              size="sm"
              onClick={handleIncrement}
              disabled={localScore === 100}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreColor().replace('text-', 'bg-')}`}
            style={{ width: `${localScore}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 📅 下一步开发计划

详细的后续步骤将在实际开发中逐步完善。每个 Phase 完成后，将根据实际情况调整下一个 Phase 的计划。

---

## 📝 开发注意事项

1. **测试驱动**：每个 API 开发完成后，立即使用 Postman 或前端测试
2. **文档同步**：代码变更时，同步更新相关文档
3. **代码规范**：使用 Biome 保持代码格式统一
4. **Git 提交**：遵循 Conventional Commits 规范
5. **渐进式开发**：优先实现核心功能，次要功能后续迭代

---

## 🔗 相关文档

- [项目规范](./PROJECT_STANDARDS.md)
- [设计文档](./DESIGN.md)
- [实现状态](./STRUCTURE_AUDIT.md)
- [依赖分析](./DEPENDENCY_ANALYSIS.md)
