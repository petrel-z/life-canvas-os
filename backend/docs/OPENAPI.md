# Life Canvas OS - OpenAPI 文档

## 📁 文件位置

OpenAPI 规范文件已生成在：
- **标准版**: [backend/docs/openapi.json](backend/docs/openapi.json)
- **Apifox 增强版**: [backend/docs/apifox_openapi.json](backend/docs/apifox_openapi.json)

---

## 📥 导入到 Apifox

### 步骤：

1. **打开 Apifox**（如果还没安装，从 [apifox.com](https://apifox.com) 下载）

2. **创建新项目** (可选)
   - 点击 "New Project"
   - 输入项目名称：`Life Canvas OS API`

3. **导入 OpenAPI 规范**
   - 点击项目右上角的 "Settings" ⚙️
   - 选择 "Import Data"
   - 选择 "OpenAPI" 格式
   - 点击 "Upload File" 或拖拽文件
   - 选择 `backend/docs/apifox_openapi.json` 或 `openapi.json`
   - 点击 "OK"

4. **查看接口**
   - 导入成功后，你将看到所有接口分类：
     - 🔐 认证管理 - PIN 码设置、验证、修改
     - 🎯 系统管理 - 八维系统 CRUD
     - 👤 用户配置 - 用户信息、设置、AI 配置
     - 📝 日记管理 - 日记 CRUD 操作
     - 🤖 AI 洞察 - 洞察生成
     - 💾 数据管理 - 备份、恢复、导出、导入
     - ❤️ 健康检查 - 系统健康状态

---

## 📋 API 接口清单

### 认证管理 `/api/pin/*`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/pin/setup` | POST | 设置 PIN 码（首次） |
| `/api/pin/verify` | POST | 验证 PIN 码 |
| `/api/pin/change` | POST | 修改 PIN 码 |
| `/api/pin/lock` | POST | 锁定应用 |
| `/api/pin/status` | GET | 获取 PIN 状态 |

### 系统管理 `/api/systems/*`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/systems` | GET | 获取所有系统 |
| `/api/systems/{system_type}` | GET | 获取系统详情 |
| `/api/systems/{system_type}/score` | PATCH | 更新系统评分 |
| `/api/systems/{system_type}/logs` | POST | 添加日志 |
| `/api/systems/{system_type}/logs` | GET | 获取日志列表 |
| `/api/systems/{system_type}/actions` | POST | 添加行动项 |
| `/api/systems/{system_type}/actions/{id}` | PATCH | 更新行动项 |
| `/api/systems/{system_type}/actions/{id}` | DELETE | 删除行动项 |

**系统类型**: `FUEL`, `PHYSICAL`, `INTELLECTUAL`, `OUTPUT`, `RECOVERY`, `ASSET`, `CONNECTION`, `ENVIRONMENT`

### 用户配置 `/api/user/*`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/user/profile` | GET | 获取用户信息 |
| `/api/user/profile` | PATCH | 更新用户信息 |
| `/api/user/settings` | GET | 获取用户设置 |
| `/api/user/settings` | PATCH | 更新用户设置 |
| `/api/user/ai-config` | POST | 保存 AI 配置 |

### 日记管理 `/api/journal/*`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/journal` | POST | 创建日记 |
| `/api/journal` | GET | 获取日记列表 |
| `/api/journal/{id}` | GET | 获取日记详情 |
| `/api/journal/{id}` | PATCH | 更新日记 |
| `/api/journal/{id}` | DELETE | 删除日记 |

### AI 洞察 `/api/insights/*`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/insights/generate` | POST | 生成洞察 |
| `/api/insights` | GET | 获取洞察历史 |
| `/api/insights/latest` | GET | 获取最新洞察 |

### 数据管理 `/api/data/*`

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/data/export` | POST | 导出数据 |
| `/api/data/import` | POST | 导入数据 |
| `/api/data/backups` | GET | 列出备份 |
| `/api/data/backup/create` | POST | 创建备份 |
| `/api/data/health` | GET | 健康检查 |

---

## 🔧 重新生成文档

如果修改了 API 接口，需要重新生成 OpenAPI 文件：

```bash
cd d:\pythonCode\life-canvas-os
python -m backend.scripts.generate_openapi
```

---

## 📝 响应格式说明

### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 业务数据
  },
  "timestamp": 1707219200000
}
```

### 列表数据响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": 1707219200000
}
```

### 错误响应

```json
{
  "code": 422,
  "message": "参数验证失败",
  "data": {
    "errors": [
      {
        "field": "pin",
        "message": "PIN 必须是 6 位数字"
      }
    ]
  },
  "timestamp": 1707219200000
}
```

---

## 🌐 在线文档

开发环境运行后，也可以访问以下地址查看在线文档：

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

---

## 📌 Apifox 使用技巧

1. **发送请求**: 在 Apifox 中直接发送请求测试 API
2. **Mock 数据**: 可以配置 Mock 服务自动返回模拟数据
3. **生成代码**: 可以自动生成前端调用代码（TypeScript/JavaScript）
4. **导出文档**: 可以导出为 HTML/PDF 格式的 API 文档
5. **团队协作**: 可以生成分享链接给团队成员

---

## 🔗 相关文档

- [API 接口文档](docs/API.md)
- [后端开发规范](docs/BACKEND_AI_RULES.md)
- [需求文档](docs/REQUIREMENT.md)
