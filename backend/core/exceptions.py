"""全局异常处理"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import traceback
import logging
from datetime import datetime
from typing import Any, Union


logger = logging.getLogger(__name__)


class AppException(Exception):
    """应用基础异常"""

    def __init__(
        self,
        message: str,
        code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        data: Any = None
    ):
        self.message = message
        self.code = code
        self.data = data
        super().__init__(message)


class NotFoundException(AppException):
    """资源未找到异常"""

    def __init__(self, resource: str = "Resource", identifier: str = ""):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
        super().__init__(
            message=message,
            code=status.HTTP_404_NOT_FOUND,
            data={"resource": resource, "identifier": identifier}
        )


class BadRequestException(AppException):
    """错误请求异常"""

    def __init__(self, message: str, data: Any = None):
        super().__init__(
            message=message,
            code=status.HTTP_400_BAD_REQUEST,
            data=data
        )


class ConflictException(AppException):
    """冲突异常"""

    def __init__(self, message: str, conflict_type: str = None):
        super().__init__(
            message=message,
            code=status.HTTP_409_CONFLICT,
            data={"conflict_type": conflict_type} if conflict_type else None
        )


class UnauthorizedException(AppException):
    """未授权异常"""

    def __init__(self, message: str = "Unauthorized", data: Any = None):
        super().__init__(
            message=message,
            code=status.HTTP_401_UNAUTHORIZED,
            data=data
        )


class ForbiddenException(AppException):
    """禁止访问异常"""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            code=status.HTTP_403_FORBIDDEN
        )


class ValidationException(AppException):
    """验证异常"""

    def __init__(self, message: str, errors: list = None):
        super().__init__(
            message=message,
            code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            data={"errors": errors} if errors else None
        )


def create_error_response(
    code: int,
    message: str,
    data: Any = None
) -> dict:
    """创建统一错误响应"""
    response = {
        "code": code,
        "message": message,
        "timestamp": int(datetime.now().timestamp() * 1000)
    }
    if data is not None:
        response["data"] = data
    return response


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """处理应用自定义异常"""
    logger.error(f"AppException: {exc.message}", extra={
        "path": request.url.path,
        "method": request.method,
        "code": exc.code
    })

    return JSONResponse(
        status_code=exc.code,
        content=create_error_response(exc.code, exc.message, exc.data)
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
) -> JSONResponse:
    """处理请求验证异常"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })

    logger.warning(f"Validation error: {len(errors)} errors", extra={
        "path": request.url.path,
        "errors": errors
    })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=create_error_response(
            code=422,
            message="参数验证失败",
            data={"errors": errors}
        )
    )


async def sqlalchemy_exception_handler(
    request: Request,
    exc: SQLAlchemyError
) -> JSONResponse:
    """处理数据库异常"""
    logger.error(f"Database error: {str(exc)}", extra={
        "path": request.url.path,
        "error_type": type(exc).__name__
    })

    # 检查是否是唯一约束冲突
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=create_error_response(
                code=409,
                message="数据冲突，可能是重复记录",
                data={"error_type": "integrity_error"}
            )
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            code=500,
            message="数据库错误，请稍后重试",
            data={"error_type": type(exc).__name__}
        )
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """处理所有未捕获的异常"""
    logger.error(f"Unhandled exception: {str(exc)}", extra={
        "path": request.url.path,
        "error_type": type(exc).__name__,
        "traceback": traceback.format_exc()
    })

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=create_error_response(
            code=500,
            message="服务器内部错误",
            data={"error_type": type(exc).__name__}
        )
    )


def setup_exception_handlers(app):
    """设置全局异常处理器"""

    # 应用自定义异常
    app.add_exception_handler(AppException, app_exception_handler)

    # FastAPI 验证异常
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # SQLAlchemy 数据库异常
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)

    # 通用异常捕获（必须最后注册）
    app.add_exception_handler(Exception, general_exception_handler)
