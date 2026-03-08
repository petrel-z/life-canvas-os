"""数据导出/导入 API"""
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
import tempfile
import os
from datetime import datetime

from backend.db.session import get_db
from backend.services.data_service import DataService
from backend.schemas.common import success_response, error_response, DataImportRequest

router = APIRouter(prefix="/api/data", tags=["data-management"])


@router.post("/export")
async def export_data(
    background_tasks: BackgroundTasks,
    format: str = Query("json", description="导出格式 (json, zip)"),
    db: Session = Depends(get_db)
):
    """
    导出数据

    Args:
        format: 导出格式 (json, zip)

    Returns:
        JSON 响应包含导出路径信息，同时提供文件下载
    """
    import sys
    print(f"[API EXPORT] Function called, format={format}", file=sys.stderr)
    try:
        print(f"[API EXPORT] In try block", file=sys.stderr)
        if format == "json":
            print(f"[API EXPORT] Calling DataService.export_data_json", file=sys.stderr)
            export_info = DataService.export_data_json(db)
            print(f"[API EXPORT] Export success: {export_info['export_path']}", file=sys.stderr)

            # 将文件复制到临时目录供下载，然后清理原文件
            temp_dir = tempfile.mkdtemp()
            temp_file = os.path.join(temp_dir, export_info["filename"])

            # 从分类目录复制到临时目录
            import shutil
            shutil.copy2(export_info["export_path"], temp_file)

            # 使用后台任务在发送后删除临时文件
            def cleanup():
                try:
                    os.remove(temp_file)
                    os.rmdir(temp_dir)
                except:
                    pass

            background_tasks.add_task(cleanup)

            # 返回 JSON 响应，包含导出路径信息
            response_data = {
                **export_info,
                "download_url": f"/api/data/download?path={export_info['export_path']}"
            }

            # 同时返回 JSON 响应和文件
            return JSONResponse(
                content=success_response(
                    data=response_data,
                    message="JSON 导出成功"
                )
            )

        elif format == "zip":
            export_info = DataService.export_data_zip(db)

            # 将文件复制到临时目录供下载，然后清理原文件
            temp_dir = tempfile.mkdtemp()
            temp_file = os.path.join(temp_dir, export_info["filename"])

            import shutil
            shutil.copy2(export_info["export_path"], temp_file)

            # 使用后台任务在发送后删除临时文件
            def cleanup():
                try:
                    os.remove(temp_file)
                    os.rmdir(temp_dir)
                except:
                    pass

            background_tasks.add_task(cleanup)

            # 返回 JSON 响应，包含导出路径信息
            response_data = {
                **export_info,
                "download_url": f"/api/data/download?path={export_info['export_path']}"
            }

            return JSONResponse(
                content=success_response(
                    data=response_data,
                    message="ZIP 导出成功"
                )
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_response(message="不支持的导出格式", code=400)
            )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_response(message=str(e), code=404)
        )
    except Exception as e:
        import traceback
        import sys
        print(f"[ERROR] Export failed: {e}", file=sys.stderr)
        print(f"[ERROR] Traceback:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response(message=f"导出失败: {str(e)}", code=500)
        )


@router.post("/import")
async def import_data(
    request: DataImportRequest,
    db: Session = Depends(get_db)
):
    """
    导入数据

    支持两种导入方式：
    1. ZIP 备份文件：通过 backup_path 指定文件路径
    2. JSON 数据：通过 data 字段直接传入 JSON 数据

    请求体:
        backup_path: 备份文件路径 (可选)
        data: JSON 格式的导入数据 (可选)
        verify: 是否验证备份文件 (默认 True)
    """
    data, status_code = DataService.import_data(
        db,
        backup_path=request.backup_path,
        data=request.data,
        verify=request.verify
    )

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="数据导入成功"
    )


@router.get("/backups")
async def list_backups(db: Session = Depends(get_db)):
    """列出所有备份"""
    data, status_code = DataService.list_backups(db)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="获取备份列表成功"
    )


@router.post("/backup/create")
async def create_backup(db: Session = Depends(get_db)):
    """创建数据库备份"""
    data, status_code = DataService.create_backup(db)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="备份创建成功"
    )


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """健康检查"""
    data = DataService.health_check()

    return success_response(
        data=data,
        message="系统健康"
    )


@router.post("/reset")
async def reset_system(db: Session = Depends(get_db)):
    """
    重置系统（危险操作，会删除所有数据）

    此操作会：
    1. 自动创建当前数据库的备份
    2. 删除所有数据
    3. 恢复到初始状态（默认用户、设置、8个系统）
    """
    data, status_code = DataService.reset_system(db)

    if status_code >= 400:
        raise HTTPException(
            status_code=status_code,
            detail=data
        )

    return success_response(
        data=data,
        message="系统重置成功"
    )
