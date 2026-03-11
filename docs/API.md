# Life Canvas OS API 接口文档

> 版本：v1.8.1
> 最后更新：2026-03-11
> 基础 URL：`http://127.0.0.1:8000`（开发环境）
> 数据格式：JSON
> 遵循规范：[API_STANDARDS.md](./API_STANDARDS.md)

## 📝 更新日志

### v1.8.1 (2026-03-11)
- ✨ **数据导入**：`backup_path` 参数新增支持 `.json` 文件路径导入
- 🔧 **数据导入**：根据文件扩展名自动判断导入类型（.zip → 完整覆盖，.json → upsert）
- 📝 **文档**：更新导入数据接口文档，添加 JSON 文件路径导入示例

### v1.8.0 (2026-03-10)
- ✨ **数据管理**：新增 `POST /api/data/reset` 系统重置接口，支持危险操作下的数据重置
- 📝 **文档**：更新数据管理接口文档，添加系统重置功能说明
- ✨ **数据导出**：新增下载端点 `GET /api/data/download`，支持通过 `download_url` 下载导出文件
- ✨ **数据导出**：导出响应新增 `export_path` 和 `download_url` 字段

### v1.6.0 (2026-03-04)
- ✨ **饮食系统**：偏离事件列表接口新增 `score_info` 字段，返回当前评分和统计数据
- ✨ **饮食系统**：新增 `GET /api/diet/score-history` 评分变化历史接口
- ✨ **系统评分**：新增 `GET /api/diet/systems/scores` 获取八大系统评分摘要
- 📝 **数据库**：新增 `system_score_logs` 表记录评分变化历史

### v1.5.0 (2026-03-03)
- ✨ **数据导入**：新增 JSON 数据直接导入功能，无需 ZIP 文件
- ✨ **数据导入**：支持 `data` 字段传入 JSON 格式数据
- 📝 **文档**：更新导入数据接口文档，添加 JSON 导入示例
- ✨ **PIN验证**：新增独立的PIN验证开关功能，支持按功能模块分别控制PIN验证
- ✨ **PIN验证**：新增 `GET /api/pin/verify-requirements` 接口，获取PIN验证要求配置
- 🔧 **用户设置**：用户设置新增4个PIN验证开关字段
- 🔪 **API清理**：移除 `GET /api/pin/status` 接口，统一使用 `/verify-requirements`
- 📝 **文档**：更新用户设置接口文档，添加PIN验证开关字段说明

### v1.3.0 (2026-03-02)
- ✨ **用户配置**：保存 AI 配置接口自动验证 API Key 有效性
- ✨ **用户配置**：验证失败时不保存配置，直接返回错误
- 🔧 **用户配置**：添加 `verified: true` 标识到成功响应
- 📝 **文档**：完善保存 AI 配置接口文档，添加自动验证说明
- 📝 **文档**：删除重复的饮食系统接口说明

### v1.2.0 (2026-03-02)
- ✨ **用户配置**：新增 API Key 验证接口，支持保存前验证 Key 有效性
- ✨ **用户配置**：支持 DeepSeek、OpenAI、豆包的 API Key 验证
- 🔧 **用户配置**：完善错误处理（401/429/504 等）
- 📝 **文档**：优化洞察生成接口文档，移除混乱的注释代码

### v1.1.0 (2026-03-02)
- ✨ **AI 洞察**：移除 `force` 参数，添加每日生成次数限制（3次/天）
- ✨ **AI 洞察**：超过限制时返回历史洞察并提示用户
- ✨ **数据导入**：修复数据库锁定问题，支持运行时导入
- 📝 **数据导入**：更新响应格式，添加 `backup_path` 字段
- 📝 **AI 洞察**：更新响应格式，添加 `_limit_reached`、`_message`、`_remaining_today` 字段

### v1.0.0
- 🎉 初始版本

---

## 📚 目录

- [统一响应格式](#统一响应格式)
- [认证模块](#认证模块)
- [系统管理](#系统管理)
- [用户配置](#用户配置)
- [日记管理](#日记管理)
- [AI 洞察](#ai-洞察)
- [审计时间轴](#审计时间轴)
- [数据管理](#数据管理)
- [数据模型](#数据模型)

---

## 📦 统一响应格式

### 标准响应结构

所有接口都遵循统一的响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": { },
  "timestamp": 1707219200000
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| code | Integer | 业务状态码 |
| message | String | 提示信息 |
| data | Any/Null | 业务数据 |
| timestamp | Long | 响应时间戳（毫秒） |

### 列表数据响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [ ],
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

**分页参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| items | Array | 数据列表 |
| total | Integer | 总记录数 |
| page | Integer | 当前页码 |
| page_size | Integer | 每页数量 |
| total_pages | Integer | 总页数 |
| has_next | Boolean | 是否有下一页 |
| has_prev | Boolean | 是否有上一页 |

### 错误响应格式

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

## 🔐 认证模块

### 1. 设置 PIN（首次）

**接口地址**：`POST /api/pin/setup`

**请求参数**：
```json
{
  "pin": "123456"
}
```

**验证规则**：
- `pin`: 必填，6 位数字，正则 `/^\d{6}$/`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "redirect_to": "/canvas"
  },
  "timestamp": 1707219200000
}
```

**错误响应（409 - PIN 已设置）**：
```json
{
  "code": 409,
  "message": "PIN 已设置",
  "data": {
    "conflict": "PIN_ALREADY_SET",
    "hint": "请使用 /api/pin/change 接口修改 PIN"
  },
  "timestamp": 1707219200000
}
```

**错误响应（422 - 参数错误）**：
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

### 2. 验证 PIN

**接口地址**：`POST /api/pin/verify`

**请求参数**：
```json
{
  "pin": "123456"
}
```

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "verified": true,
    "user_id": 1
  },
  "timestamp": 1707219200000
}
```

**错误响应（401 - 验证失败）**：
```json
{
  "code": 401,
  "message": "PIN 验证失败",
  "data": {
    "attempts_remaining": 3
  },
  "timestamp": 1707219200000
}
```

**错误响应（424 - PIN 未设置）**：
```json
{
  "code": 424,
  "message": "PIN 未设置",
  "data": {
    "hint": "请先使用 /api/pin/setup 接口设置 PIN"
  },
  "timestamp": 1707219200000
}
```

---

### 3. 修改 PIN

**接口地址**：`POST /api/pin/change`

**请求参数**：
```json
{
  "old_pin": "123456",
  "new_pin": "654321"
}
```

**验证规则**：
- `old_pin`: 必填，6 位数字
- `new_pin`: 必填，6 位数字

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "timestamp": 1707219200000
}
```

**错误响应（401 - 旧 PIN 错误）**：
```json
{
  "code": 401,
  "message": "旧 PIN 验证失败",
  "data": null,
  "timestamp": 1707219200000
}
```

---

### 4. 锁定应用

**接口地址**：`POST /api/pin/lock`

**请求参数**：无

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "locked_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

### 5. 获取 PIN 验证要求

**接口地址**：`GET /api/pin/verify-requirements`

**描述**：获取各个功能模块的PIN验证要求配置和PIN设置状态。前端可在应用启动时调用此接口，根据返回的开关状态决定是否显示PIN验证界面。

**请求参数**：无

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取PIN验证要求成功",
  "data": {
    "has_pin": true,
    "requirements": {
      "startup": true,
      "private_journal": true,
      "data_export": true,
      "settings_change": true
    }
  },
  "timestamp": 1772510957075
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| has_pin | Boolean | 是否已设置PIN码 |
| requirements | Object | PIN验证要求配置对象 |
| requirements.startup | Boolean | 启动时是否需要验证PIN |
| requirements.private_journal | Boolean | 查看私密日记时是否需要验证PIN |
| requirements.data_export | Boolean | 导出数据时是否需要验证PIN |
| requirements.settings_change | Boolean | 修改设置时是否需要验证PIN |

**使用场景**：

1. **应用启动时**：检查 `requirements.startup`，如果为 `true` 则显示PIN验证界面
2. **查看私密日记**：检查 `requirements.private_journal`，如果为 `true` 则要求验证PIN
3. **导出数据**：检查 `requirements.data_export`，如果为 `true` 则要求验证PIN
4. **修改设置**：检查 `requirements.settings_change`，如果为 `true` 则要求验证PIN

**注意**：
- 如果 `has_pin` 为 `false`，表示用户未设置PIN码，所有验证要求将不生效
- 所有开关的默认值为 `true`（启用），用户可在设置中单独控制
- 通过 `PATCH /api/user/settings` 接口可以修改这些开关配置

---

## 🎯 系统管理

### 1. 获取所有系统

**接口地址**：`GET /api/systems`

**查询参数**：
```typescript
?page=1&page_size=20&sort_by=score&sort_order=desc
```

**参数说明**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | Integer | 否 | 1 | 页码，从 1 开始 |
| page_size | Integer | 否 | 20 | 每页数量，最大 100 |
| sort_by | String | 否 | created_at | 排序字段 |
| sort_order | String | 否 | desc | 排序方向：asc/desc |

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": 1,
        "type": "FUEL",
        "score": 75,
        "created_at": "2026-02-06T10:00:00Z",
        "updated_at": "2026-02-06T10:00:00Z"
      },
      {
        "id": 2,
        "user_id": 1,
        "type": "PHYSICAL",
        "score": 60,
        "created_at": "2026-02-06T10:00:00Z",
        "updated_at": "2026-02-06T10:00:00Z"
      }
    ],
    "total": 8,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "timestamp": 1707219200000
}
```

---

### 2. 获取系统详情

**接口地址**：`GET /api/systems/{system_type}`

**路径参数**：
- `system_type`: 系统类型（FUEL, PHYSICAL, INTELLECTUAL, OUTPUT, RECOVERY, ASSET, CONNECTION, ENVIRONMENT）

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "type": "FUEL",
    "score": 75,
    "details": {
      "consistency": 80,
      "baseline_breakfast": "{\"meal\":\"oatmeal\"}",
      "baseline_lunch": "{\"meal\":\"salad\"}",
      "baseline_dinner": "{\"meal\":\"chicken\"}",
      "baseline_snacks": "[]"
    },
    "created_at": "2026-02-06T10:00:00",
    "created_at_ts": 1772173800000,
    "updated_at": "2026-02-06T10:00:00",
    "updated_at_ts": 1772173800000
  },
  "timestamp": 1707219200000
}
```

**错误响应（404 - 系统不存在）**：
```json
{
  "code": 404,
  "message": "系统不存在",
  "data": {
    "resource": "System",
    "identifier": "UNKNOWN_TYPE"
  },
  "timestamp": 1707219200000
}
```

---

### 3. 更新系统评分

**接口地址**：`PATCH /api/systems/{system_type}/score`

**路径参数**：
- `system_type`: 系统类型

**请求参数**：
```json
{
  "score": 80
}
```

**验证规则**：
- `score`: 必填，0-100 之间的整数

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "type": "FUEL",
    "old_score": 75,
    "new_score": 80,
    "updated_at": "2026-02-06T10:05:00Z"
  },
  "timestamp": 1707219200000
}
```

**错误响应（422 - 评分超出范围）**：
```json
{
  "code": 422,
  "message": "参数验证失败",
  "data": {
    "errors": [
      {
        "field": "score",
        "message": "评分必须在 0-100 之间",
        "value": 150
      }
    ]
  },
  "timestamp": 1707219200000
}
```

---

### 4. 添加日志

**接口地址**：`POST /api/systems/{system_type}/logs`

**路径参数**：
- `system_type`: 系统类型

**请求参数**：
```json
{
  "label": "运动记录",
  "value": "跑步 5 公里",
  "metadata": {
    "duration": 30,
    "calories": 300,
    "distance": 5
  }
}
```

**验证规则**：
- `label`: 必填，字符串，最大 100 字符
- `value`: 必填，字符串
- `metadata`: 可选，JSON 对象

**成功响应（201）**：
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": 123,
    "system_id": 1,
    "label": "运动记录",
    "value": "跑步 5 公里",
    "metadata": "{\"duration\":30,\"calories\":300,\"distance\":5}",
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

### 5. 获取日志列表

**接口地址**：`GET /api/systems/{system_type}/logs`

**路径参数**：
- `system_type`: 系统类型

**查询参数**：
```typescript
?page=1&page_size=20&sort_by=created_at&sort_order=desc
```

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 123,
        "system_id": 1,
        "label": "运动记录",
        "value": "跑步 5 公里",
        "metadata": "{\"duration\":30,\"calories\":300}",
        "created_at": "2026-02-06T10:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": 1707219200000
}
```

---

### 6. 添加行动项

**接口地址**：`POST /api/systems/{system_type}/actions`

**请求参数**：
```json
{
  "text": "每天运动 30 分钟"
}
```

**验证规则**：
- `text`: 必填，字符串，最大 500 字符

**成功响应（201）**：
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": 456,
    "system_id": 1,
    "text": "每天运动 30 分钟",
    "completed": 0,
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

### 7. 更新行动项

**接口地址**：`PATCH /api/systems/{system_type}/actions/{id}`

**路径参数**：
- `system_type`: 系统类型
- `id`: 行动项 ID

**请求参数**：
```json
{
  "text": "每天运动 45 分钟",
  "completed": 1
}
```

**验证规则**：
- `text`: 可选，字符串
- `completed`: 可选，0 或 1

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 456,
    "text": "每天运动 45 分钟",
    "completed": 1,
    "updated_at": "2026-02-06T10:05:00Z"
  },
  "timestamp": 1707219200000
}
```

---

### 8. 删除行动项

**接口地址**：`DELETE /api/systems/{system_type}/actions/{id}`

**路径参数**：
- `system_type`: 系统类型
- `id`: 行动项 ID

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "删除成功",
  "data": {
    "deleted_id": 456
  },
  "timestamp": 1707219200000
}
```

---

### 9. 获取饮食基准

**接口地址**：`GET /api/diet/baseline`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取饮食基准成功",
  "data": {
    "breakfast": [
      {
        "name": "燕麦粥",
        "amount": "1碗",
        "calories": 300
      }
    ],
    "lunch": [
      {
        "name": "鸡胸肉沙拉",
        "amount": "200g",
        "calories": 250
      }
    ],
    "dinner": [
      {
        "name": "蒸鱼",
        "amount": "200g",
        "calories": 200
      }
    ],
    "taste": ["清淡", "微辣"]
  },
  "timestamp": 1707219200000
}
```

---

### 10. 更新饮食基准

**接口地址**：`PUT /api/diet/baseline`

**请求参数**：
```json
{
  "breakfast": [
    {
      "name": "全麦面包",
      "amount": "2片",
      "calories": 200
    }
  ],
  "lunch": null,
  "dinner": null,
  "taste": ["清淡"]
}
```

**参数说明**：只传需要修改的字段，null 表示不修改

**成功响应（200）**：返回更新后的基准配置（格式同上）

---

### 11. 创建饮食偏离事件

**接口地址**：`POST /api/diet/deviations`

**请求参数**：
```json
{
  "description": "加班太累，点了一份麻辣烫宵夜",
  "occurred_at": "2026-02-26T22:30:00"
}
```

**参数说明**：
- `description`: 必填，偏离描述
- `occurred_at`: 可选，发生时间（ISO 格式），默认当前时间

**成功响应（201）**：
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": 10,
    "system_id": 1,
    "description": "加班太累，点了一份麻辣烫宵夜",
    "occurred_at": "2026-02-26T22:30:00Z",
    "occurred_at_ts": 1772173800000,
    "created_at": "2026-02-26T22:30:00Z",
    "created_at_ts": 1772173800000
  },
  "timestamp": 1707219200000
}
```

---

### 12. 获取饮食偏离事件列表

**接口地址**：`GET /api/diet/deviations`

**查询参数**：
```typescript
?start_date=2026-02-01&end_date=2026-02-28&page=1&page_size=20
```

**参数说明**：

| 参数 | 类型 | 说明 |
|------|------|------|
| start_date | String | 开始日期（YYYY-MM-DD） |
| end_date | String | 结束日期（YYYY-MM-DD） |
| page | Integer | 页码 |
| page_size | Integer | 每页数量 |

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 10,
        "system_id": 1,
        "description": "加班太累，点了一份麻辣烫宵夜",
        "occurred_at": "2026-02-26T22:30:00Z",
        "occurred_at_ts": 1772173800000,
        "created_at": "2026-02-26T22:30:00Z",
        "created_at_ts": 1772173800000
      }
    ],
    "total": 15,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false,
    "score_info": {
      "current_score": 92,
      "consistency": 92,
      "total_deviations": 4,
      "monthly_deviations": 1
    }
  },
  "timestamp": 1707219200000
}
```

**score_info 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| current_score | Integer | 当前系统评分（0-100） |
| consistency | Integer | 一致性分数（基础100分，每次偏离扣2分） |
| total_deviations | Integer | 总偏离次数 |
| monthly_deviations | Integer | 本月偏离次数 |

---

### 13. 获取评分变化历史

**接口地址**：`GET /api/diet/score-history`

**描述**：获取饮食系统评分变化历史记录，每次偏离事件导致的评分变化都会被记录

**查询参数**：
```typescript
?days=30
```

**参数说明**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| days | Integer | 否 | 30 | 查询天数范围（1-365） |

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取评分历史成功",
  "data": {
    "system_type": "FUEL",
    "current_score": 92,
    "history": [
      {
        "id": 1,
        "system_id": 1,
        "old_score": 94,
        "new_score": 92,
        "change_reason": "偏离事件",
        "related_id": 4,
        "created_at": "2026-03-04T09:12:42"
      }
    ]
  },
  "timestamp": 1772586768638
}
```

**history 字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 日志记录 ID |
| system_id | Integer | 系统ID |
| old_score | Integer | 变化前评分 |
| new_score | Integer | 变化后评分 |
| change_reason | String | 变化原因（如：偏离事件、手动更新） |
| related_id | Integer | 关联ID（如偏离事件ID） |
| created_at | String | 记录创建时间 |

**使用场景**：
- 绘制评分变化趋势图
- 分析评分下降原因
- 追踪偏离事件对评分的影响

---

### 14. 获取饮食偏离事件详情

**接口地址**：`GET /api/diet/deviations/{deviation_id}`

**路径参数**：
- `deviation_id`: 偏离事件 ID

**成功响应（200）**：返回偏离事件详情（格式同上）

---

### 15. 更新饮食偏离事件

**接口地址**：`PATCH /api/diet/deviations/{deviation_id}`

**请求参数**：
```json
{
  "description": "更新后的描述内容"
}
```

**成功响应（200）**：返回更新后的偏离事件

---

### 16. 删除饮食偏离事件

**接口地址**：`DELETE /api/diet/deviations/{deviation_id}`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "删除成功",
  "data": {
    "deleted_id": 10
  },
  "timestamp": 1707219200000
}
```

---

### 17. 获取饮食统计信息

**接口地址**：`GET /api/diet/statistics`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取饮食统计成功",
  "data": {
    "total_deviations": 25,
    "monthly_deviations": 5,
    "latest_deviation": "2026-02-26T22:30:00Z"
  },
  "timestamp": 1707219200000
}
```
---

### 18. 获取八大系统评分摘要

**接口地址**：`GET /api/systems/scores`

**描述**：获取八大生命系统的当前评分和总体平均分

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取系统评分成功",
  "data": {
    "systems": [
      { "type": "FUEL", "score": 92 },
      { "type": "PHYSICAL", "score": 50 },
      { "type": "INTELLECTUAL", "score": 50 },
      { "type": "OUTPUT", "score": 50 },
      { "type": "DREAM", "score": 50 },
      { "type": "ASSET", "score": 50 },
      { "type": "CONNECTION", "score": 50 },
      { "type": "ENVIRONMENT", "score": 50 }
    ],
    "average_score": 55.2,
    "total_systems": 8
  },
  "timestamp": 1772592430247
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| systems | Array | 八大系统评分列表 |
| systems[].type | String | 系统类型（FUEL/PHYSICAL/INTELLECTUAL/OUTPUT/DREAM/ASSET/CONNECTION/ENVIRONMENT） |
| systems[].score | Integer | 系统评分（0-100） |
| average_score | Float | 八大系统的平均分（保留1位小数） |
| total_systems | Integer | 系统总数（固定为8） |

**使用场景**：
- 首页雷达图展示
- 仪表盘评分概览
- 快速了解各系统状态

---

## 👤 用户配置

### 1. 获取用户信息

**接口地址**：`GET /api/user/profile`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "display_name": "User",
    "birthday": "1990-01-01",
    "mbti": "INTJ",
    "values": "[\"成长\",\"自由\",\"创新\"]",
    "life_expectancy": 85,
    "created_at": "2026-02-06T10:00:00Z",
    "updated_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

### 2. 更新用户信息

**接口地址**：`PATCH /api/user/profile`

**请求参数**：
```json
{
  "display_name": "John Doe",
  "birthday": "1990-01-01",
  "mbti": "ENTJ",
  "values": "[\"成长\",\"自由\"]",
  "life_expectancy": 80
}
```

**验证规则**：
- `display_name`: 可选，字符串，最大 100 字符
- `birthday`: 可选，日期格式 YYYY-MM-DD
- `mbti`: 可选，4 位大写字母
- `values`: 可选，JSON 数组字符串
- `life_expectancy`: 可选，50-120 之间的整数

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "display_name": "John Doe",
    "mbti": "ENTJ",
    "life_expectancy": 80,
    "updated_at": "2026-02-06T10:05:00Z"
  },
  "timestamp": 1707219200000
}
```

**错误响应（422 - 参数验证失败）**：
```json
{
  "code": 422,
  "message": "参数验证失败",
  "data": {
    "errors": [
      {
        "field": "life_expectancy",
        "message": "期望寿命必须在 50-120 之间",
        "value": 150
      },
      {
        "field": "birthday",
        "message": "生日格式错误",
        "value": "1990/01/01"
      }
    ]
  },
  "timestamp": 1707219200000
}
```

---

### 3. 获取用户设置

**接口地址**：`GET /api/user/settings`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "theme": "dark",
    "language": "zh-CN",
    "auto_save_enabled": true,
    "auto_save_interval": 60,
    "notification_enabled": true,
    "notification_time": "09:00",
    "show_year_progress": true,
    "show_weekday": true,
    "pin_verify_on_startup": true,
    "pin_verify_for_private_journal": true,
    "pin_verify_for_data_export": true,
    "pin_verify_for_settings_change": true,
    "created_at": "2026-02-06T10:00:00Z",
    "updated_at": "2026-02-06T10:00:00Z",
    "created_at_ts": 1770576595000,
    "updated_at_ts": 1772510962745
  },
  "timestamp": 1707219200000
}
```

---

### 4. 更新用户设置

**接口地址**：`PATCH /api/user/settings`

**请求参数**：
```json
{
  "theme": "light",
  "language": "en-US",
  "auto_save_enabled": false,
  "notification_time": "08:00",
  "pin_verify_on_startup": false
}
```

**验证规则**：
- `theme`: 可选，枚举值（light, dark, auto）
- `language`: 可选，语言代码
- `auto_save_enabled`: 可选，布尔值
- `auto_save_interval`: 可选，整数（10-600秒）
- `notification_enabled`: 可选，布尔值
- `notification_time`: 可选，HH:mm 格式
- `show_year_progress`: 可选，布尔值
- `show_weekday`: 可选，布尔值
- `pin_verify_on_startup`: 可选，布尔值，启动时是否验证PIN
- `pin_verify_for_private_journal`: 可选，布尔值，查看私密日记时是否验证PIN
- `pin_verify_for_data_export`: 可选，布尔值，导出数据时是否验证PIN
- `pin_verify_for_settings_change`: 可选，布尔值，修改设置时是否验证PIN

**注意**：
- 所有字段都是可选的，只更新提供的字段
- PIN验证开关字段默认值为 `true`（启用）
- 修改PIN验证开关不需要预先验证PIN码
- 建议在设置页面提供这些开关的UI控件

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "timestamp": 1707219200000
}
```

---

### 5. 保存 AI 配置（自动验证）

**接口地址**：`POST /api/user/ai-config`

**描述**：保存 AI 配置时会自动验证 API Key 有效性，只有验证通过后才会保存配置

**工作流程**：
```
用户提交配置 → 验证 API Key → 验证失败？ → 返回错误，不保存配置
                              ↓ 验证成功
                           保存配置到数据库
```

**请求参数**：
```json
{
  "provider": "deepseek",
  "api_key": "sk-xxxxxx",
  "model_name": "deepseek-chat"
}
```

**验证规则**：
- `provider`: 必填，枚举值（deepseek, doubao, openai）
- `api_key`: 必填，字符串
- `model_name`: 可选，字符串

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "AI 配置保存成功",
  "data": {
    "provider": "deepseek",
    "model_name": "deepseek-chat",
    "updated_at": "2026-03-02T14:30:00.000000",
    "verified": true
  },
  "timestamp": 1772424710405
}
```

**错误响应（401 - API Key 无效）**：
```json
{
  "code": 401,
  "message": "API Key 无效或已过期",
  "data": {
    "provider": "deepseek"
  },
  "timestamp": 1772424710405
}
```

**错误响应（504 - 验证超时）**：
```json
{
  "code": 504,
  "message": "API 请求超时，请检查网络连接",
  "timestamp": 1772424710405
}
```

**错误响应（429 - 频率超限）**：
```json
{
  "code": 429,
  "message": "API 请求频率超限，请稍后再试",
  "timestamp": 1772424710405
}
```

**错误响应（400 - 不支持的提供商）**：
```json
{
  "code": 400,
  "message": "不支持的 AI 提供商",
  "timestamp": 1772424710405
}
```

**注意事项**：
- 验证过程通常需要 1-10 秒，请耐心等待
- 验证接口需要访问 AI 服务商的 API
- 验证失败时配置不会被保存
- 验证超时时间为 10 秒

---

### 6. 验证 AI API Key

**接口地址**：`POST /api/user/ai-config/verify`

**描述**：在保存 AI 配置前验证 API Key 是否有效，避免保存无效的 Key

**请求参数**：
```json
{
  "provider": "deepseek",
  "api_key": "sk-xxxxx",
  "model": "deepseek-chat"
}
```

**参数说明**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| provider | String | 是 | AI 提供商：`deepseek`、`openai`、`doubao` |
| api_key | String | 是 | API Key |
| model | String | 否 | 模型名称（可选，使用默认值） |

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "API Key 验证成功",
  "data": {
    "valid": true,
    "provider": "deepseek",
    "model": "deepseek-chat"
  },
  "timestamp": 1772424710405
}
```

**错误响应（401 - API Key 无效）**：
```json
{
  "code": 401,
  "message": "API Key 无效或已过期",
  "data": {
    "provider": "deepseek"
  },
  "timestamp": 1772424710405
}
```

**错误响应（504 - 请求超时）**：
```json
{
  "code": 504,
  "message": "API 请求超时，请检查网络连接",
  "timestamp": 1772424710405
}
```

**错误响应（429 - 频率超限）**：
```json
{
  "code": 429,
  "message": "API 请求频率超限，请稍后再试",
  "timestamp": 1772424710405
}
```

**使用建议**：
- 在用户输入 API Key 后实时验证（防抖处理）
- 验证成功后再调用保存配置接口
- 验证超时时间为 10 秒
- 验证失败时给出明确的错误提示

**使用示例**：
```bash
# 验证 DeepSeek API Key
curl -X POST "http://localhost:8000/api/user/ai-config/verify" \
  -H "Content-Type: application/json" \
  -d '{"provider": "deepseek", "api_key": "sk-xxxxx"}'

# 验证 OpenAI API Key
curl -X POST "http://localhost:8000/api/user/ai-config/verify" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "api_key": "sk-xxxxx"}'
```

---

## 📝 日记管理

### 1. 创建日记

**接口地址**：`POST /api/journal`

**请求参数**：
```json
{
  "title": "今天心情不错",
  "content": "完成了跑步目标，感觉很好...",
  "mood": "good",
  "tags": "[\"运动\",\"健康\"]",
  "related_system": "PHYSICAL",
  "is_private": 1
}
```

**验证规则**：
- `title`: 必填，字符串，最大 200 字符
- `content`: 必填，字符串
- `mood`: 可选，枚举值（great, good, neutral, bad, terrible）
- `tags`: 可选，JSON 数组字符串
- `related_system`: 可选，系统类型
- `is_private`: 可选，0 或 1

**成功响应（201）**：
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": 789,
    "user_id": 1,
    "title": "今天心情不错",
    "content": "完成了跑步目标，感觉很好...",
    "mood": "good",
    "tags": "[\"运动\",\"健康\"]",
    "related_system": "PHYSICAL",
    "is_private": 1,
    "created_at": "2026-02-06T10:00:00",
    "created_at_ts": 1772173800000,
    "updated_at": "2026-02-06T10:00:00",
    "updated_at_ts": 1772173800000
  },
  "timestamp": 1707219200000
}
```

---

### 2. 获取日记列表

**接口地址**：`GET /api/journal`

**查询参数**：
```typescript
?page=1&page_size=20&mood=good&related_system=PHYSICAL&sort_by=created_at&sort_order=desc
```

**参数说明**：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | Integer | 页码，从 1 开始 |
| page_size | Integer | 每页数量 |
| mood | String | 情绪筛选（great, good, neutral, bad, terrible） |
| related_system | String | 关联系统筛选 |
| sort_by | String | 排序字段 |
| sort_order | String | 排序方向（asc, desc） |

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 789,
        "title": "今天心情不错",
        "content": "完成了跑步目标...",
        "mood": "good",
        "tags": "[\"运动\",\"健康\"]",
        "related_system": "PHYSICAL",
        "is_private": 1,
        "created_at": "2026-02-06T10:00:00Z",
        "updated_at": "2026-02-06T10:00:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "page_size": 20,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": 1707219200000
}
```

---

### 3. 获取日记详情

**接口地址**：`GET /api/journal/{id}`

**路径参数**：
- `id`: 日记 ID

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 789,
    "user_id": 1,
    "title": "今天心情不错",
    "content": "完成了跑步目标，感觉很好...",
    "mood": "good",
    "tags": "[\"运动\",\"健康\"]",
    "related_system": "PHYSICAL",
    "is_private": 1,
    "created_at": "2026-02-06T10:00:00Z",
    "updated_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

**错误响应（404 - 日记不存在）**：
```json
{
  "code": 404,
  "message": "日记不存在",
  "data": {
    "resource": "Journal",
    "identifier": "999"
  },
  "timestamp": 1707219200000
}
```

---

### 4. 更新日记

**接口地址**：`PATCH /api/journal/{id}`

**路径参数**：
- `id`: 日记 ID

**请求参数**：
```json
{
  "title": "今天心情非常不错",
  "content": "更新后的内容...",
  "mood": "great"
}
```

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 789,
    "title": "今天心情非常不错",
    "mood": "great",
    "updated_at": "2026-02-06T10:05:00Z"
  },
  "timestamp": 1707219200000
}
```

---

### 5. 删除日记

**接口地址**：`DELETE /api/journal/{id}`

**路径参数**：
- `id`: 日记 ID

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "删除成功",
  "data": {
    "deleted_id": 789
  },
  "timestamp": 1707219200000
}
```

---

## 🤖 AI 洞察

### 1. 生成洞察

**接口地址**：`POST /api/insights/generate`

**请求参数**：无需参数，接口会自动检查今日生成次数

**使用限制**：
- 每天最多生成 **3 次**洞察
- 超过限制后返回最新的历史洞察
- 每日限制在 UTC 00:00 重置

**成功响应（200）- 正常生成**：
```json
{
  "code": 200,
  "message": "洞察生成成功",
  "data": {
    "id": 100,
    "user_id": 1,
    "content": [
      {
        "category": "celebration",
        "insight": "饮食系统得分最高，继续保持"
      },
      {
        "category": "warning",
        "insight": "运动系统得分偏低，需要加强锻炼"
      },
      {
        "category": "action",
        "insight": "建议每天运动30分钟，可显著改善体质"
      }
    ],
    "system_scores": {
      "FUEL": 75,
      "PHYSICAL": 60,
      "INTELLECTUAL": 70,
      "OUTPUT": 80,
      "RECOVERY": 65,
      "ASSET": 70,
      "CONNECTION": 75,
      "ENVIRONMENT": 68
    },
    "provider_used": "deepseek",
    "generated_at": "2026-03-02T03:10:31",
    "generated_at_ts": 1772392231000,
    "_remaining_today": 2
  },
  "timestamp": 1772421031453
}
```

**成功响应（200）- 达到上限**：
```json
{
  "code": 200,
  "message": "洞察生成成功",
  "data": {
    "id": 100,
    "user_id": 1,
    "content": [
      {
        "category": "celebration",
        "insight": "饮食系统得分最高，继续保持"
      }
    ],
    "system_scores": {
      "FUEL": 75,
      "PHYSICAL": 60
    },
    "provider_used": "deepseek",
    "generated_at": "2026-03-02T03:10:31",
    "generated_at_ts": 1772392231000,
    "_limit_reached": true,
    "_message": "今日洞察生成次数已达上限（3次），正在返回最新的历史洞察"
  },
  "timestamp": 1772421031453
}
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `_remaining_today` | Integer | 今日剩余可生成次数（仅在未达上限时返回） |
| `_limit_reached` | Boolean | 是否达到每日上限（仅在达上限时返回） |
| `_message` | String | 提示信息（仅在达上限时返回） |

**错误响应（424 - AI 未配置）**：
```json
{
  "code": 424,
  "message": "AI 服务未配置",
  "data": {
    "hint": "请先在设置中配置 AI 服务"
  },
  "timestamp": 1707219200000
}
```

**错误响应（429 - 次数达上限且无历史）**：
```json
{
  "code": 429,
  "message": "今日洞察次数已达上限，且暂无历史洞察数据",
  "data": {
    "daily_limit": 3,
    "today_count": 3,
    "hint": "请明天再试"
  },
  "timestamp": 1707219200000
}
```

---

### 2. 获取洞察历史

**接口地址**：`GET /api/insights`

**查询参数**：
```typescript
?page=1&page_size=10&sort_by=generated_at&sort_order=desc
```

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取洞察历史成功",
  "data": {
    "items": [
      {
        "id": 100,
        "user_id": 1,
        "content": [
          {
            "category": "celebration",
            "insight": "饮食系统得分最高，继续保持"
          },
          {
            "category": "warning",
            "insight": "运动系统得分偏低，需要加强锻炼"
          }
        ],
        "system_scores": {
          "FUEL": 75,
          "PHYSICAL": 60,
          "INTELLECTUAL": 70,
          "OUTPUT": 80,
          "RECOVERY": 65,
          "ASSET": 70,
          "CONNECTION": 75,
          "ENVIRONMENT": 68
        },
        "provider_used": "deepseek",
        "generated_at": "2026-03-02T03:10:31",
        "generated_at_ts": 1772392231000,
        "created_at": "2026-03-02T03:10:31",
        "created_at_ts": 1772392231000
      }
    ],
    "total": 15,
    "page": 1,
    "page_size": 10,
    "total_pages": 2,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": 1707219200000
}
```

---

### 3. 获取最新洞察

**接口地址**：`GET /api/insights/latest`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取最新洞察成功",
  "data": {
    "id": 100,
    "user_id": 1,
    "content": [
      {
        "category": "celebration",
        "insight": "饮食系统得分最高，继续保持"
      },
      {
        "category": "warning",
        "insight": "运动系统得分偏低，需要加强锻炼"
      },
      {
        "category": "action",
        "insight": "建议每天运动30分钟，可显著改善体质"
      }
    ],
    "system_scores": {
      "FUEL": 75,
      "PHYSICAL": 60,
      "INTELLECTUAL": 70,
      "OUTPUT": 80,
      "RECOVERY": 65,
      "ASSET": 70,
      "CONNECTION": 75,
      "ENVIRONMENT": 68
    },
    "provider_used": "deepseek",
    "generated_at": "2026-03-02T03:10:31",
    "generated_at_ts": 1772392231000,
    "created_at": "2026-03-02T03:10:31",
    "created_at_ts": 1772392231000
  },
  "timestamp": 1707219200000
}
```

**错误响应（404 - 暂无洞察）**：
```json
{
  "code": 404,
  "message": "暂无洞察数据",
  "data": {
    "hint": "请先生成洞察"
  },
  "timestamp": 1707219200000
}
```

---

## 📅 审计时间轴

### 1. 获取审计时间轴

**接口地址**：`GET /api/timeline`

**描述**：聚合日记和饮食偏离事件，按时间排序并按日期分组展示

**查询参数**：
```typescript
?type=all&page=1&page_size=30
```

**参数说明**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| type | String | 是 | all | 事件类型过滤：all（全部）、diary（日记）、diet（饮食偏离） |
| page | Integer | 是 | 1 | 页码，从 1 开始 |
| page_size | Integer | 是 | 30 | 每页数量，最大 100 |

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取审计时间轴成功",
  "data": {
    "timeline": [
      {
        "date": "2026年02月26日",
        "events": [
          {
            "id": "diet_2",
            "type": "diet",
            "title": "饮食偏离记录",
            "content": "加班太累，忍不住点了一份超大份麻辣烫作为宵夜",
            "time": "15:28",
            "timestamp": 1772174229689
          },
          {
            "id": "diary_1",
            "type": "diary",
            "title": "写了新日记",
            "title": "今天完成了 Life Canvas OS 的初步构建",
            "content": "看着那些雷达图，我第一次感觉到生活是可以被这样优雅地量化的",
            "time": "16:28",
            "timestamp": 1772173800000
          }
        ]
      },
      {
        "date": "2026年02月25日",
        "events": [
          {
            "id": "diet_1",
            "type": "diet",
            "title": "饮食偏离记录",
            "content": "今天吃了太多甜点，需要调整饮食计划",
            "time": "12:28",
            "timestamp": 1772087328957
          },
          {
            "id": "diary_2",
            "type": "diary",
            "title": "写了新日记",
            "content": "阴雨天。在咖啡馆读完了《反脆弱》",
            "time": "16:28",
            "timestamp": 1772101680000
          }
        ]
      }
    ],
    "total_events": 25,
    "has_more": true
  },
  "timestamp": 1772175057524
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| timeline | Array | 日期分组列表 |
| timeline[].date | String | 日期字符串（格式：YYYY年MM月DD日） |
| timeline[].events | Array | 该日期下的事件列表 |
| events[].id | String | 事件唯一标识（格式：type_id，如 diet_1） |
| events[].type | String | 事件类型（diary 或 diet） |
| events[].title | String | 事件标题 |
| events[].content | String | 事件内容 |
| events[].time | String | 时间字符串（格式：HH:MM） |
| events[].timestamp | Integer | 毫秒级时间戳，用于排序 |
| total_events | Integer | 总事件数 |
| has_more | Boolean | 是否有更多数据 |

**筛选示例**：

```bash
# 获取全部事件
GET /api/timeline

# 仅获取日记
GET /api/timeline?type=diary

# 仅获取饮食偏离事件
GET /api/timeline?type=diet

# 分页获取
GET /api/timeline?page=2&page_size=10
```

**排序说明**：
- 事件按时间戳降序排列（最新事件在前）
- 日期分组按日期降序排列（最新日期在前）
- 同一日期内的事件按时间戳降序排列

---

## 💾 数据管理

### 1. 导出数据

**接口地址**：`POST /api/data/export`

**查询参数**：
- `format`: 导出格式 (json, zip)，默认为 `json`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "JSON 导出成功",
  "data": {
    "export_path": "C:\\Users\\xxx\\life-canvas-os\\backups\\exports\\2026-03-08\\export.json",
    "filename": "export.json",
    "download_url": "/api/data/download?path=C:\\Users\\xxx\\life-canvas-os\\backups\\exports\\2026-03-08\\export.json"
  },
  "timestamp": 1772529146615
}
```

**响应字段说明**：
| 字段 | 类型 | 说明 |
|------|------|------|
| export_path | String | 导出文件的完整路径 |
| filename | String | 导出文件名 |
| download_url | String | 下载链接，可直接用于下载文件 |

**注意事项**：
- 导出文件保存到 `backups/exports/YYYY-MM-DD/` 目录（JSON格式）或 `backups/zips/YYYY-MM-DD/` 目录（ZIP格式）
- 使用 `download_url` 直接下载导出文件

---

### 2. 导入数据

**接口地址**：`POST /api/data/import`

**描述**：支持三种导入方式：ZIP 备份文件导入、JSON 文件路径导入和 JSON 数据直接导入

**方式一：ZIP 备份文件导入（完整覆盖数据库）**

**请求参数示例**：

Windows:
```json
{
  "backup_path": "D:\\backups\\life-canvas\\backup_20260302_104334.zip",
  "verify": true
}
```

macOS:
```json
{
  "backup_path": "/Users/username/backups/life-canvas/backup_20260302_104334.zip",
  "verify": true
}
```

**参数说明**：
- `backup_path`: ZIP 备份文件的完整路径
  - Windows: 使用反斜杠 `\`（需转义为 `\\`）或正斜杠 `/`
  - macOS/Linux: 使用正斜杠 `/`
- `verify`: 是否验证备份文件完整性，默认为 `true`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "数据导入成功",
  "data": {
    "import_type": "zip",
    "backup_path": "D:\\pythonCode\\life-canvas-os\\backups\\backup_20260302_104334.zip",
    "imported_at": "2026-03-02T10:47:45.698477"
  },
  "timestamp": 1772419665698
}
```

**方式二：JSON 文件路径导入（upsert 模式）**

根据 `backup_path` 的文件扩展名自动判断导入类型：
- `.json` → JSON 文件导入（upsert 模式，不会删除现有数据）
- `.zip` → ZIP 备份恢复（完整覆盖数据库）

**请求参数示例**：

Windows:
```json
{
  "backup_path": "D:\\backups\\life-canvas\\export_20260302.json"
}
```

macOS:
```json
{
  "backup_path": "/Users/username/backups/life-canvas/export_20260302.json"
}
```

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "数据导入成功",
  "data": {
    "import_type": "json",
    "source": "file",
    "json_path": "D:\\backups\\life-canvas\\export_20260302.json",
    "stats": {
      "users": 1,
      "user_settings": 0,
      "systems": 8,
      "diaries": 0,
      "insights": 0
    },
    "imported_at": "2026-03-11T10:30:00.000000"
  },
  "timestamp": 1772529146615
}
```

**方式三：JSON 数据直接导入（upsert 模式）**

**请求参数**：
```json
{
  "data": {
    "version": "1.0.0",
    "users": [
      {
        "id": 1,
        "username": "user",
        "display_name": "User",
        "birthday": "1990-01-01",
        "mbti": "INTJ",
        "values": "[\"成长\",\"自由\"]",
        "life_expectancy": 85
      }
    ],
    "systems": [
      {
        "id": 1,
        "user_id": 1,
        "type": "FUEL",
        "score": 75,
        "details": {}
      }
    ],
    "diaries": [],
    "insights": []
  }
}
```

**JSON 数据格式说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| version | String | 数据版本，当前为 "1.0.0" |
| users | Array | 用户数据数组 |
| systems | Array | 八维系统数据数组 |
| diaries | Array | 日记数据数组（可选） |
| insights | Array | 洞察数据数组（可选） |

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "数据导入成功",
  "data": {
    "import_type": "json",
    "source": "data",
    "stats": {
      "users": 1,
      "user_settings": 0,
      "systems": 8,
      "diaries": 0,
      "insights": 0
    },
    "imported_at": "2026-03-03T17:12:26.614026"
  },
  "timestamp": 1772529146615
}
```

**错误响应（400 - 参数缺失）**：
```json
{
  "code": 400,
  "message": "必须提供 backup_path 或 data 参数",
  "timestamp": 1772529146615
}
```

**错误响应（400 - 数据格式错误）**：
```json
{
  "code": 400,
  "message": "数据格式错误：缺少 version 字段",
  "timestamp": 1772529146615
}
```

**注意事项**：
- `backup_path` 和 `data` 参数二选一，不能同时提供
- `backup_path` 支持 `.zip` 和 `.json` 两种扩展名，根据扩展名自动判断导入类型
- ZIP 导入会完全覆盖当前数据库
- JSON 导入（文件或数据）采用 upsert 策略：存在相同 ID 则更新，否则创建
- JSON 导入不会删除现有数据，只会更新或新增
- 建议在导入前先创建当前数据的备份

---

### 3. 获取备份列表

**接口地址**：`GET /api/data/backups`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "获取备份列表成功",
  "data": {
    "backups": [
      "backup_20260206_100000.db",
      "backup_20260205_100000.db"
    ],
    "total": 2
  },
  "timestamp": 1707219200000
}
```

---

### 4. 创建手动备份

**接口地址**：`POST /api/data/backup/create`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "备份创建成功",
  "data": {
    "backup_path": "/path/to/backup_20260206_100000.db",
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

### 5. 数据服务健康检查

**接口地址**：`GET /api/data/health`

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "系统健康",
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-06T10:00:00Z",
    "database": {
      "connected": true,
      "pool_status": "..."
    }
  },
  "timestamp": 1707219200000
}
```

---

### 6. 下载导出文件

**接口地址**：`GET /api/data/download`

**查询参数**：
- `path`: 文件的完整路径（必需）

**成功响应（200）**：
- 返回文件流
- `Content-Type`: `application/json` 或 `application/zip`
- `Content-Disposition`: `attachment; filename="<filename>"`

**错误响应（404 - 文件不存在）**：
```json
{
  "code": 404,
  "message": "文件不存在",
  "timestamp": 1772529146615
}
```

**使用示例**：
```bash
# 从导出响应中获取 download_url 并下载
curl -O "http://127.0.0.1:8000/api/data/download?path=C%3A%5CUsers%5Cxxx%5Clife-canvas-os%5Cbackups%5Cexports%5C2026-03-08%5Cexport.json"
```

---

### 7. 系统重置（危险操作）

**接口地址**：`POST /api/data/reset`

**警告**：此操作会删除所有用户数据，请谨慎使用！

**请求体**：无

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "系统重置成功",
  "data": {
    "backup_created": true,
    "backup_path": "C:\\path\\to\\backup\\life-canvas-os-2026-03-10.db"
  },
  "timestamp": 1772529146615
}
```

**错误响应（500）**：
```json
{
  "code": 500,
  "message": "系统重置失败: <error_message>",
  "timestamp": 1772529146615
}
```

**注意**：
- 此操作会自动创建当前数据库的备份
- 备份文件保存在 `backups/` 目录下
- 重置后会恢复到初始状态（默认用户、设置、8个系统）

---

## 📋 数据模型

### 系统类型枚举

```typescript
type SystemType =
  | "FUEL"         // 饮食系统
  | "PHYSICAL"     // 运动系统
  | "INTELLECTUAL" // 智力系统
  | "OUTPUT"       // 输出系统
  | "DREAM"        // 梦想系统
  | "ASSET"        // 资产系统
  | "CONNECTION"   // 连接系统
  | "ENVIRONMENT"; // 环境系统
```

### 情绪类型枚举

```typescript
type MoodType =
  | "great"      // 很好
  | "good"       // 好
  | "neutral"    // 一般
  | "bad"        // 不好
  | "terrible";  // 很差
```

### 主题枚举

```typescript
type Theme = "light" | "dark" | "auto";
```

### AI 提供商枚举

```typescript
type AIProvider = "deepseek" | "doubao" | "openai";
```

---

## 🔒 安全说明

1. **PIN 码安全**
   - 必须是 6 位数字
   - 使用 bcrypt 哈希存储
   - 验证失败限制次数（3 次）
   - 验证失败延迟响应

2. **API Key 安全**
   - 使用 Fernet 加密存储
   - 生产环境使用 HTTPS
   - 不在日志中记录

3. **请求频率限制**
   - 同一 IP: 100 次/分钟
   - 同一用户: 60 次/分钟
   - 敏感接口: 5 次/分钟

---

## 📝 注意事项

1. 所有请求和响应使用 JSON 格式
2. 时间字段使用 ISO 8601 格式（本地时间）
3. 时间戳字段为毫秒级 Unix 时间戳（`*_ts` 后缀字段）
4. 分页默认从第 1 页开始
5. 更新接口（PATCH）只传需要修改的字段
6. 开发环境基础 URL：`http://127.0.0.1:8000`
7. 生产环境使用 IPC 通信
8. 所有时间均使用本地时区（与用户电脑时区一致）

---

## 🔗 相关文档

- [API 规范文档](./API_STANDARDS.md)
- [OpenAPI 规范](./openapi.json)
- [开发待办清单](./DEVELOPMENT_ROADMAP.md)
- [项目规范](./PROJECT_STANDARDS.md)
