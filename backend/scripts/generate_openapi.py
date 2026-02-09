"""生成 OpenAPI 规范文件"""
import json
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def create_app_for_docs():
    """创建用于生成文档的临时应用"""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    # 导入所有路由
    from backend.core.health import router as health_router
    from backend.api.auth import router as auth_router
    from backend.api.systems import router as systems_router
    from backend.api.users import router as users_router
    from backend.api.journals import router as journals_router
    from backend.api.insights import router as insights_router
    from backend.api.data import router as data_router

    app = FastAPI(
        title="Life Canvas OS API",
        description="八维生命平衡系统 API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # 添加 CORS（文档生成不需要，但保持一致性）
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册所有路由
    app.include_router(health_router, tags=["health"])
    app.include_router(auth_router, tags=["authentication"])
    app.include_router(systems_router, tags=["systems"])
    app.include_router(users_router, tags=["users"])
    app.include_router(journals_router, tags=["journals"])
    app.include_router(insights_router, tags=["insights"])
    app.include_router(data_router, tags=["data-management"])

    return app


def generate_openapi():
    """生成 OpenAPI 规范"""
    app = create_app_for_docs()

    # 获取 OpenAPI schema
    openapi_schema = app.openapi()

    # 添加详细描述
    openapi_schema["info"]["description"] = """
# Life Canvas OS 后端 API

八维生命平衡系统后端接口，支持个人成长管理、日记记录、AI 洞察等功能。

## 主要功能

- **用户认证**: PIN 码设置、验证、修改
- **系统管理**: 八维系统（饮食、运动、智力、输出、恢复、资产、连接、环境）
- **用户配置**: 用户信息、设置、AI 配置
- **日记管理**: 日记 CRUD、附件、编辑历史
- **AI 洞察**: 基于用户数据生成个性化洞察
- **数据管理**: 备份、恢复、导出、导入

## 认证方式

本 API 使用 PIN 码认证。

## 响应格式

所有接口遵循统一的响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1707219200000
}
```

## 错误码

- `200`: 成功
- `201`: 创建成功
- `400`: 错误请求
- `401`: 未授权
- `404`: 资源不存在
- `409`: 冲突
- `422`: 参数验证失败
- `429`: 请求过于频繁
- `500`: 服务器错误

## 分页参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | Integer | 否 | 1 | 页码，从 1 开始 |
| page_size | Integer | 否 | 20 | 每页数量，最大 100 |
| sort_by | String | 否 | created_at | 排序字段 |
| sort_order | String | 否 | desc | 排序方向：asc/desc |
"""

    # 添加服务器配置
    openapi_schema["servers"] = [
        {
            "url": "http://127.0.0.1:8000",
            "description": "开发环境"
        }
    ]

    # 添加标签描述
    openapi_schema["tags"] = [
        {
            "name": "authentication",
            "description": "PIN 码认证相关接口",
            "x-displayName": "认证管理"
        },
        {
            "name": "systems",
            "description": "八维系统管理接口",
            "x-displayName": "系统管理"
        },
        {
            "name": "users",
            "description": "用户配置管理接口",
            "x-displayName": "用户配置"
        },
        {
            "name": "journals",
            "description": "日记管理接口",
            "x-displayName": "日记管理"
        },
        {
            "name": "insights",
            "description": "AI 洞察生成接口",
            "x-displayName": "AI 洞察"
        },
        {
            "name": "data-management",
            "description": "数据管理接口（备份、恢复、导出、导入）",
            "x-displayName": "数据管理"
        },
        {
            "name": "health",
            "description": "健康检查接口",
            "x-displayName": "健康检查"
        }
    ]

    return openapi_schema


def save_openapi_files(schema: dict, output_dir: Path):
    """保存 OpenAPI 文件"""
    output_dir = output_dir / "docs"
    output_dir.mkdir(exist_ok=True)

    # 保存 JSON 格式（标准版）
    json_path = output_dir / "openapi.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
    print(f"[OK] Generated: {json_path.relative_to(project_root)}")

    # 保存适合 Apifox 的增强版本
    apifox_json_path = output_dir / "apifox_openapi.json"
    enhance_for_apifox(schema, apifox_json_path)
    print(f"[OK] Generated: {apifox_json_path.relative_to(project_root)}")


def enhance_for_apifox(schema: dict, output_path: Path):
    """生成适合 Apifox 的增强版本"""
    apifox_schema = schema.copy()

    # 中文接口名称映射（使用实际的 operationId）
    operation_names = {
        "root__get": "根路径",
        "ping_ping_get": "健康检查",

        # PIN 认证
        "setup_pin_api_pin_setup_post": "设置PIN码",
        "verify_pin_code_api_pin_verify_post": "验证PIN码",
        "change_pin_api_pin_change_post": "修改PIN码",
        "lock_app_api_pin_lock_post": "锁定应用",
        "get_pin_status_api_pin_status_get": "获取PIN状态",

        # 系统管理
        "get_systems_api_systems_get": "获取系统列表",
        "get_system_detail_api_systems__system_type__get": "获取系统详情",
        "update_system_score_api_systems__system_type__score_patch": "更新系统评分",
        "create_system_log_api_systems__system_type__logs_post": "添加日志",
        "get_system_logs_api_systems__system_type__logs_get": "获取日志列表",
        "create_system_action_api_systems__system_type__actions_post": "添加行动项",
        "update_system_action_api_systems__system_type__actions__action_id__patch": "更新行动项",
        "delete_system_action_api_systems__system_type__actions__action_id__delete": "删除行动项",

        # 用户配置
        "get_user_profile_api_user_profile_get": "获取用户信息",
        "update_user_profile_api_user_profile_patch": "更新用户信息",
        "get_user_settings_api_user_settings_get": "获取用户设置",
        "update_user_settings_api_user_settings_patch": "更新用户设置",
        "save_ai_config_api_user_ai_config_post": "保存AI配置",
        "get_ai_config_api_user_ai_config_get": "获取AI配置",

        # 日记管理
        "create_diary_api_journal_post": "创建日记",
        "get_diaries_api_journal_get": "获取日记列表",
        "get_diary_detail_api_journal__diary_id__get": "获取日记详情",
        "update_diary_api_journal__journal_id__patch": "更新日记",
        "delete_diary_api_journal__journal_id__delete": "删除日记",

        # AI 洞察
        "generate_insight_api_insights_generate_post": "生成洞察",
        "get_insights_api_insights_get": "获取洞察历史",
        "get_latest_insight_endpoint_api_insights_latest_get": "获取最新洞察",

        # 数据管理
        "export_data_api_data_export_post": "导出数据",
        "import_data_api_data_import_post": "导入数据",
        "list_backups_api_data_backups_get": "列出备份",
        "create_backup_api_data_backup_create_post": "创建备份",
        "health_check_api_data_health_get": "数据健康检查"
    }

    # 操作 ID 到响应 schema 的映射
    operation_response_schemas = {
        # PIN 认证
        "setup_pin_api_pin_setup_post": None,  # 使用默认响应
        "verify_pin_code_api_pin_verify_post": {"$ref": "#/components/schemas/PinVerifyResponse"},
        "change_pin_api_pin_change_post": None,
        "lock_app_api_pin_lock_post": {"$ref": "#/components/schemas/LockResponse"},
        "get_pin_status_api_pin_status_get": {"$ref": "#/components/schemas/AuthStatusResponse"},

        # 系统管理
        "get_systems_api_systems_get": {"type": "object", "properties": {
            "items": {"type": "array", "items": {"$ref": "#/components/schemas/SystemResponse"}},
            "total": {"type": "integer"},
            "page": {"type": "integer"},
            "page_size": {"type": "integer"},
            "total_pages": {"type": "integer"},
            "has_next": {"type": "boolean"},
            "has_prev": {"type": "boolean"}
        }},
        "get_system_detail_api_systems__system_type__get": {"$ref": "#/components/schemas/SystemResponse"},
        "update_system_score_api_systems__system_type__score_patch": {"$ref": "#/components/schemas/SystemScoreUpdateResponse"},
        "create_system_log_api_systems__system_type__logs_post": {"$ref": "#/components/schemas/SystemLogResponse"},
        "get_system_logs_api_systems__system_type__logs_get": {"type": "object", "properties": {
            "items": {"type": "array", "items": {"$ref": "#/components/schemas/SystemLogResponse"}},
            "total": {"type": "integer"},
            "page": {"type": "integer"},
            "page_size": {"type": "integer"}
        }},
        "create_system_action_api_systems__system_type__actions_post": {"$ref": "#/components/schemas/SystemActionResponse"},
        "update_system_action_api_systems__system_type__actions__action_id__patch": {"$ref": "#/components/schemas/SystemActionResponse"},
        "delete_system_action_api_systems__system_type__actions__action_id__delete": {"$ref": "#/components/schemas/SystemActionDeleteResponse"},

        # 用户配置
        "get_user_profile_api_user_profile_get": {"$ref": "#/components/schemas/UserResponse"},
        "update_user_profile_api_user_profile_patch": {"$ref": "#/components/schemas/UserResponse"},
        "get_user_settings_api_user_settings_get": {"$ref": "#/components/schemas/UserSettingsResponse"},
        "update_user_settings_api_user_settings_patch": {"$ref": "#/components/schemas/UserSettingsResponse"},
        "save_ai_config_api_user_ai_config_post": {"type": "object", "properties": {
            "provider": {"type": "string"},
            "model_name": {"type": "string"},
            "updated_at": {"type": "string"}
        }},
        "get_ai_config_api_user_ai_config_get": {"$ref": "#/components/schemas/AIConfigResponse"},

        # 日记管理
        "create_diary_api_journal_post": {"$ref": "#/components/schemas/DiaryResponse"},
        "get_diaries_api_journal_get": {"type": "object", "properties": {
            "items": {"type": "array", "items": {"$ref": "#/components/schemas/DiaryResponse"}},
            "total": {"type": "integer"},
            "page": {"type": "integer"},
            "page_size": {"type": "integer"},
            "total_pages": {"type": "integer"},
            "has_next": {"type": "boolean"},
            "has_prev": {"type": "boolean"}
        }},
        "get_diary_detail_api_journal__diary_id__get": {"$ref": "#/components/schemas/DiaryResponse"},
        "update_diary_api_journal__journal_id__patch": {"$ref": "#/components/schemas/DiaryResponse"},
        "delete_diary_api_journal__journal_id__delete": {"$ref": "#/components/schemas/DiaryDeleteResponse"},

        # AI 洞察
        "generate_insight_api_insights_generate_post": {"$ref": "#/components/schemas/InsightGenerateResponse"},
        "get_insights_api_insights_get": {"type": "object", "properties": {
            "items": {"type": "array", "items": {"$ref": "#/components/schemas/InsightResponse"}},
            "total": {"type": "integer"},
            "page": {"type": "integer"},
            "page_size": {"type": "integer"},
            "total_pages": {"type": "integer"},
            "has_next": {"type": "boolean"},
            "has_prev": {"type": "boolean"}
        }},
        "get_latest_insight_endpoint_api_insights_latest_get": {"$ref": "#/components/schemas/InsightResponse"},

        # 数据管理
        "export_data_api_data_export_post": {"type": "string", "format": "binary"},
        "import_data_api_data_import_post": {"type": "object", "properties": {
            "imported_at": {"type": "string"}
        }},
        "list_backups_api_data_backups_get": {"type": "object", "properties": {
            "backups": {"type": "array", "items": {"type": "object"}},
            "total": {"type": "integer"}
        }},
        "create_backup_api_data_backup_create_post": {"type": "object", "properties": {
            "backup_path": {"type": "string"},
            "created_at": {"type": "string"}
        }},
        "health_check_api_data_health_get": {"type": "object", "properties": {
            "status": {"type": "string"},
            "timestamp": {"type": "string"},
            "database": {"type": "object"}
        }}
    }

    # Apifox 特定扩展
    apifox_schema["x-apifox"] = {
        "importParameters": {
            "format": "json",
            "encoding": "UTF-8",
            "dataType": "openapi"
        },
        "mockServer": "http://127.0.0.1:8000",
        "id": "life-canvas-os-api",
        "name": "Life Canvas OS API"
    }

    # 添加通用响应 schema
    if "components" not in apifox_schema:
        apifox_schema["components"] = {}
    if "schemas" not in apifox_schema["components"]:
        apifox_schema["components"]["schemas"] = {}

    # 添加缺失的响应 schema 定义
    apifox_schema["components"]["schemas"].update({
        "PinVerifyResponse": {
            "type": "object",
            "properties": {
                "verified": {"type": "boolean"},
                "user_id": {"type": "integer"}
            }
        },
        "LockResponse": {
            "type": "object",
            "properties": {
                "locked_at": {"type": "string", "format": "date-time"}
            }
        },
        "AuthStatusResponse": {
            "type": "object",
            "properties": {
                "has_pin_set": {"type": "boolean"}
            }
        },
        "SystemResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "type": {"type": "string", "enum": ["FUEL", "PHYSICAL", "INTELLECTUAL", "OUTPUT", "RECOVERY", "ASSET", "CONNECTION", "ENVIRONMENT"]},
                "score": {"type": "integer", "minimum": 0, "maximum": 100},
                "details": {"type": "object"},
                "created_at": {"type": "string", "format": "date-time"},
                "updated_at": {"type": "string", "format": "date-time"}
            }
        },
        "SystemScoreUpdateResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "type": {"type": "string"},
                "old_score": {"type": "integer"},
                "new_score": {"type": "integer"},
                "updated_at": {"type": "string", "format": "date-time"}
            }
        },
        "SystemLogResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "system_id": {"type": "integer"},
                "label": {"type": "string"},
                "value": {"type": "string"},
                "meta_data": {"type": "object"},
                "created_at": {"type": "string", "format": "date-time"}
            }
        },
        "SystemActionResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "system_id": {"type": "integer"},
                "text": {"type": "string"},
                "completed": {"type": "boolean"},
                "created_at": {"type": "string", "format": "date-time"},
                "updated_at": {"type": "string", "format": "date-time"}
            }
        },
        "SystemActionDeleteResponse": {
            "type": "object",
            "properties": {
                "deleted_id": {"type": "integer"}
            }
        },
        "UserResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "username": {"type": "string"},
                "display_name": {"type": "string"},
                "birthday": {"type": "string", "format": "date"},
                "mbti": {"type": "string"},
                "values": {"type": "string"},
                "life_expectancy": {"type": "integer"},
                "created_at": {"type": "string", "format": "date-time"},
                "updated_at": {"type": "string", "format": "date-time"}
            }
        },
        "UserSettingsResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "user_id": {"type": "integer"},
                "theme": {"type": "string", "enum": ["light", "dark", "auto"]},
                "language": {"type": "string"},
                "auto_save_enabled": {"type": "boolean"},
                "auto_save_interval": {"type": "integer"},
                "notification_enabled": {"type": "boolean"},
                "notification_time": {"type": "string"},
                "show_year_progress": {"type": "boolean"},
                "show_weekday": {"type": "boolean"},
                "created_at": {"type": "string", "format": "date-time"},
                "updated_at": {"type": "string", "format": "date-time"}
            }
        },
        "AIConfigResponse": {
            "type": "object",
            "properties": {
                "provider": {"type": "string", "enum": ["deepseek", "doubao", "openai"]},
                "model_name": {"type": "string"},
                "api_key_masked": {"type": "string"},
                "updated_at": {"type": "string", "format": "date-time"}
            }
        },
        "DiaryResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "title": {"type": "string"},
                "content": {"type": "string"},
                "mood": {"type": "string", "enum": ["great", "good", "neutral", "bad", "terrible"]},
                "tags": {"type": "string"},
                "related_system": {"type": "string"},
                "is_private": {"type": "boolean"},
                "created_at": {"type": "string", "format": "date-time"},
                "updated_at": {"type": "string", "format": "date-time"}
            }
        },
        "DiaryDeleteResponse": {
            "type": "object",
            "properties": {
                "deleted_id": {"type": "integer"}
            }
        },
        "InsightGenerateResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "user_id": {"type": "integer"},
                "content": {"type": "array", "items": {"type": "object"}},
                "system_scores": {"type": "object"},
                "provider_used": {"type": "string"},
                "generated_at": {"type": "string", "format": "date-time"}
            }
        },
        "InsightResponse": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "user_id": {"type": "integer"},
                "content": {"type": "array", "items": {"type": "object"}},
                "system_scores": {"type": "object"},
                "provider_used": {"type": "string"},
                "generated_at": {"type": "string", "format": "date-time"}
            }
        }
    })

    # 增强接口描述和响应
    if "paths" in apifox_schema:
        for path, methods in apifox_schema["paths"].items():
            for method, details in methods.items():
                # 使用中文接口名
                operation_id = details.get("operationId", "")
                if operation_id in operation_names:
                    details["summary"] = operation_names[operation_id]

                # 添加中文描述
                if "description" not in details:
                    details["description"] = details.get("summary", "")

                # 修复响应 schema
                if "responses" in details and "200" in details["responses"]:
                    if operation_id in operation_response_schemas:
                        data_schema = operation_response_schemas[operation_id]
                        if data_schema is not None:
                            details["responses"]["200"]["content"]["application/json"]["schema"] = {
                                "type": "object",
                                "properties": {
                                    "code": {"type": "integer", "example": 200},
                                    "message": {"type": "string", "example": "success"},
                                    "data": data_schema,
                                    "timestamp": {"type": "integer", "example": 1707219200000}
                                }
                            }
                        else:
                            # 默认响应
                            details["responses"]["200"]["content"]["application/json"]["schema"] = {
                                "type": "object",
                                "properties": {
                                    "code": {"type": "integer", "example": 200},
                                    "message": {"type": "string", "example": "success"},
                                    "data": {"type": "object"},
                                    "timestamp": {"type": "integer", "example": 1707219200000}
                                }
                            }

    # 保存
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(apifox_schema, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    print("="*50)
    print("Generating OpenAPI specification for Apifox")
    print("="*50)

    schema = generate_openapi()

    output_dir = Path(__file__).parent.parent
    save_openapi_files(schema, output_dir)

    print("\n" + "="*50)
    print("[SUCCESS] OpenAPI files generated!")
    print("="*50)
    print("\nGenerated files:")
    print("  - docs/openapi.json (standard version)")
    print("  - docs/apifox_openapi.json (Apifox enhanced version)")
    print("\nImport steps for Apifox:")
    print("  1. Open Apifox")
    print("  2. Click 'Import' -> 'OpenAPI'")
    print("  3. Select docs/apifox_openapi.json")
    print("  4. Click 'OK' to import")
    print("="*50)
