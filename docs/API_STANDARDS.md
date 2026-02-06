# Life Canvas OS API 接口规范文档

> 版本：v1.0.0
> 更新日期：2026-02-06
> 遵循标准：RESTful API、OpenAPI 3.0、JSON API

---

## 📋 目录

- [设计原则](#设计原则)
- [统一响应体格式](#统一响应体格式)
- [HTTP 状态码规范](#http-状态码规范)
- [接口命名规范](#接口命名规范)
- [请求规范](#请求规范)
- [错误处理规范](#错误处理规范)
- [接口定义](#接口定义)
- [数据模型](#数据模型)

---

## 🎯 设计原则

### RESTful API 核心原则

1. **资源导向**
   - 一切皆资源，每个资源有唯一 URI
   - 使用名词而非动词
   - 示例：`/api/systems` 而非 `/api/getSystems`

2. **HTTP 方法语义**
   - `GET`：查询资源（幂等、安全）
   - `POST`：创建资源（非幂等）
   - `PUT`：整体更新资源（幂等）
   - `PATCH`：部分更新资源（幂等）
   - `DELETE`：删除资源（幂等）

3. **无状态**
   - 每个请求包含所有必要信息
   - 服务器不保存客户端状态

4. **统一接口**
   - 统一的响应体格式
   - 统一的错误处理
   - 统一的命名规范

---

## 📦 统一响应体格式

### 标准响应结构

所有接口返回的响应体都遵循以下格式：

```typescript
// 成功响应
{
  "code": 200,           // 业务状态码
  "message": "success",  // 提示信息
  "data": { },           // 业务数据
  "timestamp": 1707219200000  // 时间戳（毫秒）
}

// 列表数据响应
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [ ],        // 数据列表
    "total": 100,        // 总数
    "page": 1,           // 当前页
    "page_size": 20      // 每页数量
  },
  "timestamp": 1707219200000
}

// 无数据响应（DELETE、部分 UPDATE）
{
  "code": 200,
  "message": "success",
  "data": null,
  "timestamp": 1707219200000
}
```

### 响应体字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | Integer | ✅ | 业务状态码，与 HTTP 状态码一致 |
| message | String | ✅ | 提示信息，成功时为 "success" |
| data | Any/Null | ✅ | 业务数据，可为对象、数组或 null |
| timestamp | Long | ✅ | 响应时间戳（毫秒） |

### 列表响应分页参数

查询列表类接口统一使用以下分页参数：

**请求参数：**
```typescript
{
  "page": 1,           // 页码，从 1 开始
  "page_size": 20,     // 每页数量，默认 20，最大 100
  "sort_by": "created_at",  // 排序字段
  "sort_order": "desc"      // 排序方向：asc/desc
}
```

**响应结构：**
```typescript
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],    // 数据列表
    "total": 100,       // 总记录数
    "page": 1,          // 当前页
    "page_size": 20,    // 每页数量
    "total_pages": 5,   // 总页数
    "has_next": true,   // 是否有下一页
    "has_prev": false   // 是否有上一页
  },
  "timestamp": 1707219200000
}
```

---

## 🔢 HTTP 状态码规范

### 常用状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功（无返回内容） |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证/认证失败 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如重复创建） |
| 422 | Unprocessable Entity | 参数验证失败 |
| 429 | Too Many Requests | 请求频率限制 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务不可用 |

### 业务状态码扩展

在响应体 `code` 字段中，可以使用更细粒度的业务状态码：

```typescript
// 成功类 (2xxx)
200: "操作成功"
201: "创建成功"

// 客户端错误类 (4xxx)
400: "请求参数错误"
401: "未认证"
403: "无权限"
404: "资源不存在"
409: "资源冲突"
422: "参数验证失败"
423: "PIN 已设置"
424: "PIN 未设置"

// 服务端错误类 (5xxx)
500: "服务器内部错误"
503: "服务暂不可用"
```

---

## 📝 接口命名规范

### URL 设计原则

1. **使用名词复数**
   ```
   ✅ GET /api/systems
   ❌ GET /api/system
   ❌ GET /api/getSystems
   ```

2. **使用小写字母和连字符**
   ```
   ✅ GET /api/user/profile
   ❌ GET /api/userProfile
   ❌ GET /api/User/Profile
   ```

3. **版本控制**
   ```
   ✅ /api/v1/systems
   ✅ /api/v2/systems
   ```

4. **资源层级关系**
   ```
   ✅ GET /api/systems/{id}/logs
   ✅ GET /api/systems/{id}/actions
   ```

5. **过滤和查询**
   ```
   ✅ GET /api/journals?mood=great&page=1
   ❌ GET /api/journals/great
   ```

### 接口命名示例

| 功能 | 方法 | URL | 说明 |
|------|------|-----|------|
| 获取所有系统 | GET | `/api/systems` | 查询列表 |
| 获取系统详情 | GET | `/api/systems/{type}` | 查询单个 |
| 创建系统 | POST | `/api/systems` | 创建资源 |
| 更新系统 | PUT | `/api/systems/{type}` | 整体更新 |
| 部分更新 | PATCH | `/api/systems/{type}/score` | 部分更新 |
| 删除系统 | DELETE | `/api/systems/{type}` | 删除资源 |
| 获取系统日志 | GET | `/api/systems/{type}/logs` | 子资源 |
| 添加行动项 | POST | `/api/systems/{type}/actions` | 子资源操作 |

---

## 📨 请求规范

### 请求头

```http
Content-Type: application/json
Accept: application/json
User-Agent: LifeCanvasOS/1.0.0
```

### 请求体格式

**创建资源（POST）：**
```json
{
  "title": "日记标题",
  "content": "日记内容",
  "mood": "good"
}
```

**部分更新（PATCH）：**
```json
{
  "mood": "great"  // 只传需要更新的字段
}
```

**批量操作（POST）：**
```json
{
  "action": "batch_delete",
  "ids": [1, 2, 3, 4, 5]
}
```

### 查询参数规范

```typescript
// 分页
?page=1&page_size=20

// 排序
?sort_by=created_at&sort_order=desc

// 过滤
?mood=great&status=active

// 搜索
?keyword=跑步

// 字段选择
?fields=id,title,mood

// 时间范围
?start_date=2026-01-01&end_date=2026-12-31
```

---

## ⚠️ 错误处理规范

### 标准错误响应

```typescript
{
  "code": 400,
  "message": "请求参数错误",
  "data": {
    "errors": [
      {
        "field": "pin",
        "message": "PIN 必须是 6 位数字"
      },
      {
        "field": "score",
        "message": "评分必须在 0-100 之间"
      }
    ]
  },
  "timestamp": 1707219200000
}
```

### 错误响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| code | Integer | 错误状态码 |
| message | String | 错误概要 |
| data.errors | Array | 详细错误列表 |
| data.errors[].field | String | 错误字段 |
| data.errors[].message | String | 错误描述 |

### 常见错误场景

**1. 参数验证失败（422）**
```json
{
  "code": 422,
  "message": "参数验证失败",
  "data": {
    "errors": [
      {
        "field": "pin",
        "message": "PIN 必须是 6 位数字",
        "value": "123"
      }
    ]
  },
  "timestamp": 1707219200000
}
```

**2. 资源不存在（404）**
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

**3. 业务逻辑错误（409）**
```json
{
  "code": 409,
  "message": "PIN 已设置",
  "data": {
    "conflict": "PIN_ALREADY_SET",
    "hint": "使用 /api/pin/change 接口修改 PIN"
  },
  "timestamp": 1707219200000
}
```

**4. 服务器错误（500）**
```json
{
  "code": 500,
  "message": "服务器内部错误",
  "data": {
    "error_id": "ERR_20260206_001",
    "detail": "请联系管理员并提供此错误 ID"
  },
  "timestamp": 1707219200000
}
```

---

## 🔌 接口定义

### 1. 认证模块

#### 1.1 设置 PIN

**接口地址：** `POST /api/pin/setup`

**请求体：**
```json
{
  "pin": "123456"
}
```

**成功响应（200）：**
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

**错误响应（409）：**
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

**验证规则：**
- `pin`: 必填，6 位数字，正则 `/^\d{6}$/`

---

#### 1.2 验证 PIN

**接口地址：** `POST /api/pin/verify`

**请求体：**
```json
{
  "pin": "123456"
}
```

**成功响应（200）：**
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

**错误响应（401）：**
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

---

### 2. 系统管理模块

#### 2.1 获取所有系统

**接口地址：** `GET /api/systems`

**查询参数：**
```typescript
?page=1&page_size=20
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "type": "FUEL",
        "score": 75,
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

#### 2.2 获取系统详情

**接口地址：** `GET /api/systems/{type}`

**路径参数：**
- `type`: 系统类型（FUEL, PHYSICAL, INTELLECTUAL 等）

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "type": "FUEL",
    "score": 75,
    "details": {
      "consistency": 80,
      "baseline_breakfast": "{\"meal\":\"oatmeal\"}"
    },
    "created_at": "2026-02-06T10:00:00Z",
    "updated_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

#### 2.3 更新系统评分

**接口地址：** `PATCH /api/systems/{type}/score`

**路径参数：**
- `type`: 系统类型

**请求体：**
```json
{
  "score": 80
}
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "type": "FUEL",
    "old_score": 75,
    "new_score": 80
  },
  "timestamp": 1707219200000
}
```

**验证规则：**
- `score`: 必填，0-100 之间的整数

---

#### 2.4 添加日志

**接口地址：** `POST /api/systems/{type}/logs`

**请求体：**
```json
{
  "label": "运动记录",
  "value": "跑步 5 公里",
  "metadata": {
    "duration": 30,
    "calories": 300
  }
}
```

**成功响应（201）：**
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": 123,
    "system_id": 1,
    "label": "运动记录",
    "value": "跑步 5 公里",
    "metadata": "{\"duration\":30,\"calories\":300}",
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

#### 2.5 获取日志列表

**接口地址：** `GET /api/systems/{type}/logs`

**查询参数：**
```typescript
?page=1&page_size=20&sort_by=created_at&sort_order=desc
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 123,
        "label": "运动记录",
        "value": "跑步 5 公里",
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

### 3. 用户配置模块

#### 3.1 获取用户信息

**接口地址：** `GET /api/user/profile`

**成功响应（200）：**
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

#### 3.2 更新用户信息

**接口地址：** `PATCH /api/user/profile`

**请求体：**
```json
{
  "display_name": "John Doe",
  "mbti": "ENTJ"
}
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "display_name": "John Doe",
    "mbti": "ENTJ",
    "updated_at": "2026-02-06T10:05:00Z"
  },
  "timestamp": 1707219200000
}
```

---

#### 3.3 获取用户设置

**接口地址：** `GET /api/user/settings`

**成功响应（200）：**
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
    "updated_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

#### 3.4 更新用户设置

**接口地址：** `PATCH /api/user/settings`

**请求体：**
```json
{
  "theme": "light",
  "language": "en-US"
}
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": null,
  "timestamp": 1707219200000
}
```

---

### 4. 日记管理模块

#### 4.1 创建日记

**接口地址：** `POST /api/journal`

**请求体：**
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

**成功响应（201）：**
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": 789,
    "title": "今天心情不错",
    "content": "完成了跑步目标，感觉很好...",
    "mood": "good",
    "tags": "[\"运动\",\"健康\"]",
    "related_system": "PHYSICAL",
    "is_private": 1,
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

#### 4.2 获取日记列表

**接口地址：** `GET /api/journal`

**查询参数：**
```typescript
?page=1&page_size=20&mood=good&related_system=PHYSICAL&sort_by=created_at&sort_order=desc
```

**成功响应（200）：**
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
        "created_at": "2026-02-06T10:00:00Z"
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

#### 4.3 获取日记详情

**接口地址：** `GET /api/journal/{id}`

**路径参数：**
- `id`: 日记 ID

**成功响应（200）：**
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

---

#### 4.4 更新日记

**接口地址：** `PATCH /api/journal/{id}`

**路径参数：**
- `id`: 日记 ID

**请求体：**
```json
{
  "title": "今天心情非常不错",
  "mood": "great"
}
```

**成功响应（200）：**
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

#### 4.5 删除日记

**接口地址：** `DELETE /api/journal/{id}`

**路径参数：**
- `id`: 日记 ID

**成功响应（200）：**
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

### 5. AI 洞察模块

#### 5.1 生成洞察

**接口地址：** `POST /api/insights/generate`

**请求体：**
```json
{
  "force": false
}
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 100,
    "content": "[{\"category\":\"饮食\",\"insight\":\"最近饮食一致性较高\"}]",
    "system_scores": "{\"FUEL\":75,\"PHYSICAL\":60}",
    "provider_used": "deepseek",
    "generated_at": "2026-02-06T10:00:00Z",
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

#### 5.2 获取洞察历史

**接口地址：** `GET /api/insights`

**查询参数：**
```typescript
?page=1&page_size=10
```

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 100,
        "content": "[{\"category\":\"饮食\",\"insight\":\"...\"}]",
        "provider_used": "deepseek",
        "generated_at": "2026-02-06T10:00:00Z"
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

#### 5.3 获取最新洞察

**接口地址：** `GET /api/insights/latest`

**成功响应（200）：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 100,
    "content": "[{\"category\":\"饮食\",\"insight\":\"最近饮食一致性较高\"}]",
    "system_scores": "{\"FUEL\":75,\"PHYSICAL\":60,\"INTELLECTUAL\":70}",
    "provider_used": "deepseek",
    "generated_at": "2026-02-06T10:00:00Z",
    "created_at": "2026-02-06T10:00:00Z"
  },
  "timestamp": 1707219200000
}
```

---

## 📊 数据模型

### 系统类型枚举

```typescript
enum SystemType {
  FUEL = "FUEL",                  // 饮食系统
  PHYSICAL = "PHYSICAL",          // 运动系统
  INTELLECTUAL = "INTELLECTUAL",  // 智力系统
  OUTPUT = "OUTPUT",              // 输出系统
  RECOVERY = "RECOVERY",          // 恢复系统
  ASSET = "ASSET",                // 资产系统
  CONNECTION = "CONNECTION",      // 连接系统
  ENVIRONMENT = "ENVIRONMENT"     // 环境系统
}
```

### 情绪类型枚举

```typescript
enum MoodType {
  GREAT = "great",      // 很好
  GOOD = "good",        // 好
  NEUTRAL = "neutral",  // 一般
  BAD = "bad",          // 不好
  TERRIBLE = "terrible" // 很差
}
```

### 主题枚举

```typescript
enum Theme {
  LIGHT = "light",
  DARK = "dark",
  AUTO = "auto"
}
```

### AI 提供商枚举

```typescript
enum AIProvider {
  DEEPSEEK = "deepseek",
  DOUBAO = "doubao",
  OPENAI = "openai"
}
```

---

## 🔒 安全规范

### 1. PIN 码安全

- 必须是 6 位数字
- 使用 bcrypt 哈希存储（cost=12）
- 验证失败限制次数（3 次）
- 验证失败延迟响应（防止暴力破解）

### 2. API Key 安全

- 使用 Fernet 加密存储（AES-128）
- 生产环境使用 HTTPS 传输
- 不在日志中记录 API Key
- 定期轮换 API Key

### 3. 请求频率限制

```
同一 IP: 100 次/分钟
同一用户: 60 次/分钟
敏感接口（PIN 验证）: 5 次/分钟
```

---

## 📝 开发注意事项

### 后端开发

1. **统一响应封装**
   ```python
   # backend/core/response.py
   def success_response(data=None, message="success"):
       return {
           "code": 200,
           "message": message,
           "data": data,
           "timestamp": int(time.time() * 1000)
       }

   def error_response(code, message, errors=None):
       return {
           "code": code,
           "message": message,
           "data": {"errors": errors} if errors else None,
           "timestamp": int(time.time() * 1000)
       }
   ```

2. **参数验证装饰器**
   ```python
   from pydantic import BaseModel, Field

   class PINSetup(BaseModel):
       pin: str = Field(..., pattern=r"^\d{6}$")

   @router.post("/api/pin/setup")
   async def setup_pin(pin_data: PINSetup):
       # 业务逻辑
       pass
   ```

3. **统一异常处理**
   ```python
   from fastapi import FastAPI, Request
   from fastapi.responses import JSONResponse

   @app.exception_handler(ValueError)
   async def value_error_handler(request: Request, exc: ValueError):
       return JSONResponse(
           status_code=422,
           content=error_response(422, str(exc))
       )
   ```

### 前端开发

1. **API 请求封装**
   ```typescript
   // src/renderer/lib/api.ts
   interface ApiResponse<T> {
     code: number
     message: string
     data: T
     timestamp: number
   }

   async function request<T>(url: string, options?: RequestInit): Promise<T> {
     const response = await fetch(url, options)
     const result: ApiResponse<T> = await response.json()

     if (result.code !== 200) {
       throw new Error(result.message)
     }

     return result.data
   }
   ```

2. **错误处理**
   ```typescript
   try {
     const data = await request<System[]>('/api/systems')
     // 处理数据
   } catch (error) {
     // 显示错误提示
     toast.error(error.message)
   }
   ```

---

## 🔗 相关文档

- [API 接口文档](./API.md)
- [OpenAPI 规范](./openapi.json)
- [开发待办清单](./DEVELOPMENT_ROADMAP.md)
- [项目规范](./PROJECT_STANDARDS.md)
