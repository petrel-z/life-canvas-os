"""
Life Canvas OS - Python Backend
主入口文件，支持双模式运行：
- 开发模式：python main.py --dev (HTTP 服务器，便于调试)
- 生产模式：python main.py (IPC 通信，Electron 调用)
"""
import sys
import json
import threading
from pathlib import Path

# ============ 路径处理（必须在所有导入之前）============
# 获取项目根目录
current_file = Path(__file__).resolve()
backend_dir = current_file.parent
project_root = backend_dir.parent

# 将项目根目录添加到 Python 路径
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

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

    # 创建 FastAPI 应用
    app = FastAPI(
        title="Life Canvas OS API",
        description="八维生命平衡系统 API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
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

    @app.on_event("startup")
    async def startup_event():
        """应用启动时的初始化"""
        from backend.db.session import DatabaseManager
        from backend.db.session import SessionLocal
        from backend.db.init_db import ensure_database_initialized

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

    @app.on_event("shutdown")
    async def shutdown_event():
        """应用关闭时的清理"""
        from backend.db.session import DatabaseManager

        # 关闭所有数据库连接
        DatabaseManager.close_all_connections()
        print("[INFO] All database connections closed")

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

        # 构建请求
        request_kwargs = {
            'method': method,
            'url': path,
        }

        if params:
            request_kwargs['params'] = params
        if body and method in ['POST', 'PUT', 'PATCH']:
            request_kwargs['json'] = body

        async with AsyncClient(app=app, base_url="http://test") as ac:
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
        # action 格式：create_api_journals -> POST /api/journals
        # action 格式：patch_api_dimensions_123 -> PATCH /api/dimensions/123

        method_map = {
            'get': 'GET',
            'create': 'POST',
            'update': 'PUT',
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
        path_parts = path_part.split('_')
        path = '/' + '/'.join(path_parts)

        return api_call_wrapper(method, path, params, params)

    def ipc_loop():
        """IPC 通信循环"""
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

        for line in sys.stdin:
            try:
                # 解析长度前缀格式
                line = line.strip()
                if not line:
                    continue

                length = int(line)
                json_data = sys.stdin.read(length)
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
                sys.stdout.write(f'{len(response_bytes)}\n{response_str}')
                sys.stdout.flush()

            except Exception as e:
                error_response = {
                    'id': request.get('id', '') if 'request' in locals() else '',
                    'success': False,
                    'error': str(e)
                }
                error_str = json.dumps(error_response, ensure_ascii=False)
                error_bytes = error_str.encode('utf-8')
                sys.stdout.write(f'{len(error_bytes)}\n{error_str}')
                sys.stdout.flush()

    if __name__ == "__main__":
        # 在单独线程中启动 IPC 循环
        ipc_thread = threading.Thread(target=ipc_loop, daemon=True)
        ipc_thread.start()

        # 保持主线程运行
        import time
        while True:
            time.sleep(1)
