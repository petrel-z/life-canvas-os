"""数据导出/导入 API"""
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import tempfile
import os
from datetime import datetime

from backend.db.session import get_db
from backend.services.data_service import DataService
from backend.schemas.common import success_response, error_response

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
    """
    try:
        if format == "json":
            export_path, filename, media_type = DataService.export_data_json(db)
            export_dir = os.path.dirname(export_path)

            # 使用后台任务在发送后删除文件
            def cleanup():
                try:
                    os.remove(export_path)
                    os.rmdir(export_dir)
                except:
                    pass

            background_tasks.add_task(cleanup)

            return FileResponse(
                export_path,
                filename=filename,
                media_type=media_type
            )

        elif format == "zip":
            backup_path, filename, media_type = DataService.export_data_zip(db)

            # 使用后台任务在发送后删除文件
            def cleanup():
                try:
                    os.remove(backup_path)
                except:
                    pass

            background_tasks.add_task(cleanup)

            return FileResponse(
                backup_path,
                filename=filename,
                media_type=media_type
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_response(message=f"导出失败: {str(e)}", code=500)
        )


@router.post("/import")
async def import_data(
    backup_path: str,
    verify: bool = True,
    db: Session = Depends(get_db)
):
    """
    导入数据

    Args:
        backup_path: 备份文件路径
        verify: 是否验证备份文件
    """
    data, status_code = DataService.import_data(db, backup_path, verify)

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
