# Life Canvas OS API 接口文档

> 版本：v1.0.0
> 基础 URL：`http://127.0.0.1:8000`（开发环境）
> 数据格式：JSON
> 遵循规范：[API_STANDARDS.md](./API_STANDARDS.md)

---

## 📚 目录

- [统一响应格式](#统一响应格式)
- [认证模块](#认证模块)
- [系统管理](#系统管理)
- [用户配置](#用户配置)
- [日记管理](#日记管理)
- [AI 洞察](#ai-洞察)
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
    "created_at": "2026-02-06T10:00:00Z",
    "updated_at": "2026-02-06T10:00:00Z"
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
    "user_id": 1,
    "theme": "dark",
    "language": "zh-CN",
    "auto_save_enabled": true,
    "auto_save_interval": 60,
    "notification_enabled": true,
    "notification_time": "09:00",
    "show_year_progress": true,
    "show_weekday": true,
    "created_at": "2026-02-06T10:00:00Z",
    "updated_at": "2026-02-06T10:00:00Z"
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
  "notification_time": "08:00"
}
```

**验证规则**：
- `theme`: 可选，枚举值（light, dark, auto）
- `language`: 可选，语言代码
- `auto_save_enabled`: 可选，布尔值
- `auto_save_interval`: 可选，整数（秒）
- `notification_enabled`: 可选，布尔值
- `notification_time`: 可选，HH:mm 格式
- `show_year_progress`: 可选，布尔值
- `show_weekday`: 可选，布尔值

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

### 5. 保存 AI 配置

**接口地址**：`POST /api/user/ai-config`

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
  "message": "success",
  "data": {
    "provider": "deepseek",
    "model_name": "deepseek-chat",
    "updated_at": "2026-02-06T10:05:00Z"
  },
  "timestamp": 1707219200000
}
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
    "created_at": "2026-02-06T10:00:00Z",
    "updated_at": "2026-02-06T10:00:00Z"
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

**请求参数**：
```json
{
  "force": false
}
```

**参数说明**：
- `force`: 是否强制重新生成（默认 false）

**成功响应（200）**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 100,
    "user_id": 1,
    "content": "[{\"category\":\"饮食\",\"insight\":\"最近饮食一致性较高，继续保持\"},{\"category\":\"运动\",\"insight\":\"运动量适中，建议增加有氧运动\"}]",
    "system_scores": "{\"FUEL\":75,\"PHYSICAL\":60,\"INTELLECTUAL\":70,\"OUTPUT\":80,\"RECOVERY\":65,\"ASSET\":70,\"CONNECTION\":75,\"ENVIRONMENT\":68}",
    "provider_used": "deepseek",
    "generated_at": "2026-02-06T10:00:00Z",
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

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
  "message": "success",
  "data": {
    "items": [
      {
        "id": 100,
        "content": "[{\"category\":\"饮食\",\"insight\":\"...\"}]",
        "system_scores": "{\"FUEL\":75,\"PHYSICAL\":60}",
        "provider_used": "deepseek",
        "generated_at": "2026-02-06T10:00:00Z",
        "created_at": "2026-02-06T10:00:00Z"
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
  "message": "success",
  "data": {
    "id": 100,
    "content": "[{\"category\":\"饮食\",\"insight\":\"最近饮食一致性较高\"},{\"category\":\"运动\",\"insight\":\"运动系统评分稳定\"}]",
    "system_scores": "{\"FUEL\":75,\"PHYSICAL\":60,\"INTELLECTUAL\":70,\"OUTPUT\":80,\"RECOVERY\":65,\"ASSET\":70,\"CONNECTION\":75,\"ENVIRONMENT\":68}",
    "provider_used": "deepseek",
    "generated_at": "2026-02-06T10:00:00Z",
    "created_at": "2026-02-06T10:00:00Z"
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

## 📋 数据模型

### 系统类型枚举

```typescript
type SystemType =
  | "FUEL"         // 饮食系统
  | "PHYSICAL"     // 运动系统
  | "INTELLECTUAL" // 智力系统
  | "OUTPUT"       // 输出系统
  | "RECOVERY"     // 恢复系统
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
2. 时间字段使用 ISO 8601 格式（UTC）
3. 时间戳字段为毫秒级 Unix 时间戳
4. 分页默认从第 1 页开始
5. 更新接口（PATCH）只传需要修改的字段
6. 开发环境基础 URL：`http://127.0.0.1:8000`
7. 生产环境使用 IPC 通信

---

## 🔗 相关文档

- [API 规范文档](./API_STANDARDS.md)
- [OpenAPI 规范](./openapi.json)
- [开发待办清单](./DEVELOPMENT_ROADMAP.md)
- [项目规范](./PROJECT_STANDARDS.md)
