# Life Canvas OS - 后端 AI 编码准则

本文档专为后端开发设计，提炼自 `STANDARDS.md`，旨在确保 Python/FastAPI 代码的一致性和高质量。

## 1. 技术栈

- **语言**: Python 3.12+
- **Web 框架**: FastAPI
- **ORM**: SQLAlchemy (Async Session)
- **数据验证**: Pydantic v2
- **数据库**: PostgreSQL / SQLite (Dev)
- **测试**: Pytest

## 2. 命名规范

- **文件/模块**: `snake_case` (例: `user_profile.py`, `auth_service.py`)
- **类 (Class)**: `PascalCase` (例: `UserProfile`, `UserService`)
- **变量/函数/方法**: `snake_case` (例: `get_user_by_id`, `is_active`)
- **常量**: `UPPER_SNAKE_CASE` (例: `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`)
- **私有成员**: `_` 前缀 (例: `_internal_helper`, `_cache`)

## 3. Python/FastAPI 规范

### 3.1 类型提示 (Type Hints)
- **强制使用**: 所有函数参数和返回值必须包含类型注解。
- **Pydantic**: API 请求体和响应体必须定义 Pydantic 模型 (`schemas/`)。
- **Optional**: 明确标记可选参数 (`str | None` 或 `Optional[str]`)，不要只给默认值 `None` 而不写类型。

### 3.2 异步编程 (Async)
- **路由处理**: 所有 I/O 密集的路由处理函数必须是 `async def`。
- **数据库操作**: 必须使用 `await session.execute(...)` 等异步方法。
- **避免阻塞**: 严禁在 `async` 函数中使用同步 I/O 操作 (如 `time.sleep`, `requests.get`)，应使用 `asyncio.sleep`, `httpx` 等。

### 3.3 项目结构
```text
backend/
├── api/            # 路由定义 (Endpoints)
│   └── v1/
├── core/           # 核心配置 (Config, Security, Exceptions)
├── db/             # 数据库连接与 Session 管理
├── models/         # SQLAlchemy ORM 模型 (Database Schema)
├── schemas/        # Pydantic 模型 (Data Transfer Objects)
├── services/       # 业务逻辑层 (Service Layer)
└── tests/          # 测试用例
```

## 4. 数据库规范 (SQLAlchemy)

- **ORM 模型**: 继承自 `Base`，表名通常使用复数形式 (`users`, `items`)。
- **Session 管理**: 使用依赖注入 (`Depends(get_db)`) 获取 Session，确保请求结束后自动关闭。
- **迁移**: 数据库结构变更必须生成 Alembic 迁移脚本。

## 5. 代码复杂度与规模 (Complexity Limits)

- **文件长度**: 单个文件原则上不超过 **300 行**。超过时必须拆分 (如将大 Service 拆分为多个小 Service)。
- **函数长度**: 单个函数原则上不超过 **50 行**。
- **嵌套深度**: 避免超过 **3 层** 的逻辑嵌套。优先使用“卫语句” (Guard Clauses) 提前返回。
- **参数数量**: 函数参数不超过 **3 个**。超过时使用 Pydantic 模型或字典传参。

## 6. 错误处理与安全

- **异常处理**:
  - 禁止捕获所有异常 (`except Exception: pass`)。
  - 必须抛出具体的 `HTTPException` (来自 `fastapi`)，并包含适当的状态码和错误信息。
- **SQL 注入**: 严禁拼接 SQL 字符串，必须使用 ORM 或参数化查询。
- **敏感数据**: 
  - 严禁在代码中硬编码密钥、密码或 Token。
  - 必须从环境变量 (`.env`) 或配置中心读取。
  - 日志中禁止打印敏感数据。

## 7. 路径与导入

- **绝对导入**: 优先使用绝对导入 (例: `from backend.schemas.user import UserCreate`)，避免过多使用相对导入 (`...`).
- **导入顺序**: 标准库 -> 第三方库 -> 本地模块。

## 8. 注释与文档

- **Docstrings**: 所有导出的模块、类、函数必须包含 Docstring (Google Style 或 NumPy Style)。
- **注释**: 解释 "为什么" (Why) 而不是 "做什么" (What)。
- **TODO**: 使用 `# TODO: 说明` 标记未完成或待优化的逻辑。
