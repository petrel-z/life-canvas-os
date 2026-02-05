"""
Life Canvas OS - Python Backend
主入口文件，支持双模式运行：
- 开发模式：python main.py --dev (HTTP 服务器，便于调试)
- 生产模式：python main.py (IPC 通信，Electron 调用)
"""
import sys
import json
import threading

# 判断运行模式
IS_DEV = '--dev' in sys.argv

if IS_DEV:
    # 开发模式：启动 FastAPI HTTP 服务器
    import uvicorn
    from fastapi import FastAPI
    from core.health import router as health_router
    from api.test import router as test_router

    app = FastAPI(title="Life Canvas OS API")

    # 注册路由
    app.include_router(health_router, tags=["health"])
    app.include_router(test_router)  # 添加测试路由

    @app.get("/")
    async def root():
        return {"message": "Life Canvas OS Backend", "mode": "development"}

    if __name__ == "__main__":
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000,
            log_level="info"
        )
else:
    # 生产模式：IPC 通信（通过 stdin/stdout 与 Electron 通信）
    def ipc_loop():
        """IPC 通信循环"""
        action_handlers = {
            'ping': lambda params: {'action': 'pong', 'status': 'ok'},
            # TODO: 添加其他 action 处理器
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
                    response = {
                        'id': request.get('id', ''),
                        'success': False,
                        'error': f'Unknown action: {action}'
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
