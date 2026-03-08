"""
Life Canvas OS - Python Backend
主入口文件，支持双模式运行：
- 开发模式：python main.py --dev (HTTP 服务器，便于调试)
- 生产模式：python main.py (IPC 通信，Electron 调用)
"""
import sys
import json
import threading
import os
import argparse
from pathlib import Path
from contextlib import asynccontextmanager

# ============ 早期参数解析（必须在所有业务模块导入之前）============
# 解析命令行参数以获取数据目录
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument("--data-dir", help="Application data directory")
parser.add_argument("--dev", action="store_true", help="Run in development mode")
args, unknown = parser.parse_known_args()

if args.data_dir:
    os.environ["APP_DATA_DIR"] = args.data_dir
    # 确保存储目录存在
    Path(args.data_dir).mkdir(parents=True, exist_ok=True)

# ============ 路径处理（必须在所有导入之前）============
# 获取项目根目录
current_file = Path(__file__).resolve()
backend_dir = current_file.parent

# PyInstaller 打包后的路径处理
if hasattr(sys, '_MEIPASS'):
    # 打包后的环境：添加 _MEIPASS 到路径
    sys.path.insert(0, sys._MEIPASS)
else:
    # 开发环境：使用项目根目录
    project_root = backend_dir.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

# 判断运行模式
IS_DEV = '--dev' in sys.argv

if IS_DEV:
    # 开发模式：启动 FastAPI HTTP 服务器
    import uvicorn
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    # 导入路由
    from backend.core.health import router as health_router
    from backend.api.test import router as test_router
    from backend.api.auth import router as auth_router
    from backend.api.diet import router as diet_router
    from backend.api.systems import router as systems_router
    from backend.api.users import router as users_router
    from backend.api.journals import router as journals_router
    from backend.api.insights import router as insights_router
    from backend.api.data import router as data_router
    from backend.api.timeline import router as timeline_router

    # 导入中间件和异常处理
    from backend.core.middleware import (
        RateLimitMiddleware,
        TimeoutMiddleware,
        SecurityHeadersMiddleware,
        RequestLoggingMiddleware
    )
    from backend.core.exceptions import setup_exception_handlers
    from backend.core.logging_config import setup_logging

    # 设置日志
    setup_logging(log_level="INFO", enable_json=True)

    # 定义 lifespan 上下文管理器（替代已弃用的 on_event）
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """应用生命周期管理：启动时初始化，关闭时清理"""
        from backend.db.session import DatabaseManager
        from backend.db.session import SessionLocal
        from backend.db.init_db import ensure_database_initialized

        # ===== 启动时 =====
        print("\n" + "="*50)
        print("Life Canvas OS Backend Starting...")
        print("="*50)

        # 确保数据库已初始化
        db = SessionLocal()
        try:
            was_empty = ensure_database_initialized(db)
            if was_empty:
                print("[OK] Database auto-initialized on first run")
        except Exception as e:
            print(f"[ERROR] Database initialization failed: {e}")
        finally:
            db.close()

        # 测试数据库连接
        if DatabaseManager.test_connection():
            print("[OK] Database connection established")
        else:
            print("[WARN] Database connection test failed")

        # 显示连接池状态
        pool_status = DatabaseManager.get_pool_status()
        print(f"[INFO] Pool status: {pool_status}")

        print("="*50 + "\n")

        yield  # 应用运行中

        # ===== 关闭时 =====
        DatabaseManager.close_all_connections()
        print("[INFO] All database connections closed")

    # 创建 FastAPI 应用
    app = FastAPI(
        title="Life Canvas OS API",
        description="八维生命平衡系统 API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )

    # 添加 CORS 中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 添加自定义中间件（注意顺序很重要）
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(TimeoutMiddleware, timeout=30.0)

    # 设置全局异常处理
    setup_exception_handlers(app)

    # 注册路由
    app.include_router(health_router, tags=["health"])
    app.include_router(test_router, tags=["test"])
    app.include_router(auth_router, tags=["authentication"])
    app.include_router(diet_router, tags=["diet"])
    app.include_router(systems_router, tags=["systems"])
    app.include_router(users_router, tags=["users"])
    app.include_router(journals_router, tags=["journals"])
    app.include_router(insights_router, tags=["insights"])
    app.include_router(data_router, tags=["data-management"])
    app.include_router(timeline_router, tags=["timeline"])

    @app.get("/")
    async def root():
        return {
            "message": "Life Canvas OS Backend API",
            "version": "1.0.0",
            "mode": "development",
            "docs": "/docs",
            "health": "/api/data/health"
        }

    if __name__ == "__main__":
        uvicorn.run(
            "backend.main:app",
            host="127.0.0.1",
            port=8000,
            reload=True,
            log_level="info"
        )

else:
    # 生产模式：IPC 通信（通过 stdin/stdout 与 Electron 通信）
    import asyncio
    from httpx import AsyncClient

    # FastAPI 应用实例（用于内部调用）
    _app = None
    _app_lock = threading.Lock()

    def get_app_instance():
        """获取 FastAPI 应用实例（惰性加载）"""
        global _app
        if _app is None:
            with _app_lock:
                if _app is None:
                    from fastapi import FastAPI
                    from fastapi.middleware.cors import CORSMiddleware

                    # 导入路由
                    from backend.core.health import router as health_router
                    from backend.api.test import router as test_router
                    from backend.api.auth import router as auth_router
                    from backend.api.diet import router as diet_router
                    from backend.api.systems import router as systems_router
                    from backend.api.users import router as users_router
                    from backend.api.journals import router as journals_router
                    from backend.api.insights import router as insights_router
                    from backend.api.data import router as data_router
                    from backend.api.timeline import router as timeline_router
                    from backend.core.exceptions import setup_exception_handlers

                    # 创建 FastAPI 应用
                    _app = FastAPI(
                        title="Life Canvas OS API",
                        description="八维生命平衡系统 API",
                        version="1.0.0",
                    )

                    # 添加 CORS 中间件
                    _app.add_middleware(
                        CORSMiddleware,
                        allow_origins=["*"],
                        allow_credentials=True,
                        allow_methods=["*"],
                        allow_headers=["*"],
                    )

                    # 设置全局异常处理
                    setup_exception_handlers(_app)

                    # 注册路由
                    _app.include_router(health_router, tags=["health"])
                    _app.include_router(test_router, tags=["test"])
                    _app.include_router(auth_router, tags=["authentication"])
                    _app.include_router(systems_router, tags=["systems"])
                    _app.include_router(users_router, tags=["users"])
                    _app.include_router(journals_router, tags=["journals"])
                    _app.include_router(insights_router, tags=["insights"])
                    _app.include_router(data_router, tags=["data-management"])
                    _app.include_router(timeline_router, tags=["timeline"])

        return _app

    async def call_api(method: str, path: str, params: dict = None, body: dict = None):
        """内部调用 API"""
        app = get_app_instance()

        # 使用 httpx 的 ASGITransport 来直接调用 FastAPI 应用
        from httpx import ASGITransport

        # 构建请求
        request_kwargs = {
            'method': method,
            'url': f'http://test{path}',
        }

        if params:
            request_kwargs['params'] = params
        if body and method in ['POST', 'PUT', 'PATCH']:
            request_kwargs['json'] = body

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.request(**request_kwargs)
            return response.json()

    def api_call_wrapper(method: str, path: str, params: dict = None, body: dict = None):
        """同步包装器"""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(call_api(method, path, params, body))
        finally:
            loop.close()

    def handle_generic_action(action: str, params: dict):
        """通用 action 处理器 - 将 action 映射到 API 调用"""
        # action 格式：get_api_user_profile -> GET /api/user/profile
        # action 格式：post_api_journals -> POST /api/journals
        # action 格式：create_api_journals -> POST /api/journals (alias)
        # action 格式：patch_api_dimensions_123 -> PATCH /api/dimensions/123
        # action 格式：delete_api_journals_123 -> DELETE /api/journals/123

        # 支持两种命名方式：HTTP 方法名 (post/put) 和语义名 (create/update)
        method_map = {
            'get': 'GET',
            'create': 'POST',
            'post': 'POST',  # 别名
            'update': 'PUT',
            'put': 'PUT',  # 别名
            'patch': 'PATCH',
            'delete': 'DELETE',
        }

        parts = action.split('_', 1)
        if len(parts) != 2:
            return {'error': f'Invalid action format: {action}'}

        method_prefix, path_part = parts
        method = method_map.get(method_prefix.lower())

        if not method:
            return {'error': f'Unknown method: {method_prefix}'}

        # 转换路径：api_user_profile -> /api/user/profile
        # 保留连字符：api_pin_verify-requirements -> /api/pin/verify-requirements
        path = '/' + path_part.replace('_', '/')

        # 对于 POST/PUT/PATCH 请求，params 作为 body 传递；对于 GET/DELETE，作为查询参数
        if method in ['POST', 'PUT', 'PATCH']:
            return api_call_wrapper(method, path, None, params)
        else:
            return api_call_wrapper(method, path, params, None)

    def ipc_loop():
        """IPC 通信循环"""
        # 确保数据库已初始化
        from backend.db.session import SessionLocal
        from backend.db.init_db import ensure_database_initialized

        try:
            db = SessionLocal()
            ensure_database_initialized(db)
            db.close()
            print("[INFO] Database initialized successfully in IPC mode", file=sys.stderr)
        except Exception as e:
            print(f"[ERROR] Database initialization failed: {e}", file=sys.stderr)

        # 导入认证处理器
        from backend.api.auth import handle_auth_action

        action_handlers = {
            'ping': lambda params: {'action': 'pong', 'status': 'ok'},
            'verify_pin': lambda params: handle_auth_action('verify_pin', params),
            'set_pin': lambda params: handle_auth_action('set_pin', params),
            'get_auth_status': lambda params: handle_auth_action('get_auth_status', params),
            # 通用 API 调用处理器
            'api_call': lambda params: handle_generic_action(params.get('action', ''), params),
        }

        # 使用二进制模式读取 stdin
        while True:
            try:
                # 读取长度前缀（直到换行符）
                length_bytes = b''
                while True:
                    byte = sys.stdin.buffer.read(1)
                    if not byte:
                        return  # EOF
                    if byte == b'\n':
                        break
                    length_bytes += byte

                if not length_bytes:
                    continue

                length_str = length_bytes.decode('utf-8')
                length = int(length_str)

                # 读取指定长度的 JSON 数据
                json_bytes = sys.stdin.buffer.read(length)
                if len(json_bytes) < length:
                    print(f"[IPC] Incomplete data: expected {length}, got {len(json_bytes)}", file=sys.stderr, flush=True)
                    continue

                json_data = json_bytes.decode('utf-8')
                request = json.loads(json_data)

                # 路由到对应的处理器
                action = request.get('action', '')
                handler = action_handlers.get(action)

                if handler:
                    result = handler(request.get('params', {}))
                    response = {
                        'id': request.get('id', ''),
                        'success': True,
                        'data': result
                    }
                else:
                    # 尝试使用通用处理器
                    result = handle_generic_action(action, request.get('params', {}))
                    response = {
                        'id': request.get('id', ''),
                        'success': not result.get('error'),
                        'data': result
                    }

                # 发送响应（长度前缀格式）
                response_str = json.dumps(response, ensure_ascii=False)
                response_bytes = response_str.encode('utf-8')
                # 使用字节长度，并发送字节数据
                sys.stdout.buffer.write(f'{len(response_bytes)}\n'.encode('utf-8'))
                sys.stdout.buffer.write(response_bytes)
                sys.stdout.buffer.flush()

            except Exception as e:
                print(f"[IPC] Error processing request: {e}", file=sys.stderr, flush=True)
                import traceback
                traceback.print_exc(file=sys.stderr)
                error_response = {
                    'id': request.get('id', '') if 'request' in locals() else '',
                    'success': False,
                    'error': str(e)
                }
                error_str = json.dumps(error_response, ensure_ascii=False)
                error_bytes = error_str.encode('utf-8')
                # 使用字节长度，并发送字节数据
                sys.stdout.buffer.write(f'{len(error_bytes)}\n'.encode('utf-8'))
                sys.stdout.buffer.write(error_bytes)
                sys.stdout.buffer.flush()

    if __name__ == "__main__":
        # 在单独线程中启动 IPC 循环
        ipc_thread = threading.Thread(target=ipc_loop, daemon=True)
        ipc_thread.start()

        # 保持主线程运行
        import time
        while True:
            time.sleep(1)
