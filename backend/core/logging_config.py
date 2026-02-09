"""日志配置"""
import logging
import logging.handlers
import sys
from pathlib import Path
from datetime import datetime
import json


class JSONFormatter(logging.Formatter):
    """JSON 格式化器"""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # 添加额外字段
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)

        return json.dumps(log_data, ensure_ascii=False)


class ContextFilter(logging.Filter):
    """添加上下文信息的过滤器"""

    def filter(self, record: logging.LogRecord) -> bool:
        # 添加请求 ID（如果存在）
        # from backend.core.logging import request_id_var
        # request_id = request_id_var.get(None)
        # if request_id:
        #     record.request_id = request_id

        return True


def setup_logging(
    log_level: str = "INFO",
    log_dir: str = None,
    enable_json: bool = True
) -> logging.Logger:
    """
    设置应用日志

    Args:
        log_level: 日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: 日志目录
        enable_json: 是否使用 JSON 格式

    Returns:
        配置好的 logger
    """
    # 创建日志目录
    if log_dir:
        log_path = Path(log_dir)
        log_path.mkdir(exist_ok=True)
    else:
        log_path = Path(__file__).parent.parent / "logs"
        log_path.mkdir(exist_ok=True)

    # 获取根 logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, log_level.upper()))

    # 清除现有 handlers
    logger.handlers.clear()

    # 创建格式化器
    if enable_json:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    # 控制台 handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 文件 handler - 所有日志
    all_log_file = log_path / "app.log"
    file_handler = logging.handlers.RotatingFileHandler(
        all_log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # 文件 handler - 仅错误日志
    error_log_file = log_path / "error.log"
    error_handler = logging.handlers.RotatingFileHandler(
        error_log_file,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)

    # 添加上下文过滤器
    context_filter = ContextFilter()
    logger.addFilter(context_filter)

    # 设置第三方库的日志级别
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)

    logger.info(f"Logging initialized - Level: {log_level}, JSON: {enable_json}")
    return logger


def get_logger(name: str) -> logging.Logger:
    """获取指定名称的 logger"""
    return logging.getLogger(name)
