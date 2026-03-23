# Agent API 重构总结

## 重构概述

将 Agent API 从 `src/renderer/hooks/useAgentApi.ts` 重构到 `src/renderer/api/agent.ts`，采用统一的 API 封装模式。

---

## 主要改动

### 1. 新增文件

#### `src/renderer/api/agent.ts`

新的 Agent API 封装模块，包含：

**类型定义**：
- `ChatResponse` - 聊天响应
- `ConfirmRequest` - 确认请求
- `SessionMessage` - 会话消息
- `HistoryResponse` - 会话历史响应
- `SessionSummary` - 会话摘要
- `SessionsResponse` - 会话列表响应
- `SessionDetailResponse` - 会话详情响应

**API 方法**：
- `chat(message, sessionId?)` - 发送聊天请求
- `chatStream(message, sessionId?, signal?)` - 发送流式聊天请求（AsyncGenerator）
- `confirm(request)` - 确认操作
- `getHistory(sessionId, limit?)` - 获取会话历史
- `deleteSession(sessionId)` - 删除会话
- `getSessions()` - 获取会话列表
- `getSession(sessionId)` - 获取会话详情

**会话管理**：
- `getCurrentSessionId()` - 获取当前会话 ID
- `setSessionId(sessionId)` - 设置会话 ID
- `clearSessionId()` - 清除当前会话 ID
- `createSession()` - 创建新会话
- `switchSession(sessionId)` - 切换会话
- `getSessionList()` - 获取会话历史列表
- `removeSessionFromList(sessionId)` - 从历史列表中移除会话

**设计特点**：
- 采用对象导出模式 `export const agentApi = { ... }`
- 与项目中其他 API 模块（如 `ai.ts`）保持一致的代码风格
- 完整的 TypeScript 类型定义
- 支持流式响应的 SSE 解析

---

### 2. 修改文件

#### `src/renderer/hooks/useAgentApi.ts`

将原有的 Hook 实现改为适配层，使用新的 `agentApi`：

**修改前**：直接实现 API 调用逻辑
**修改后**：委托给 `agentApi` 实现

```typescript
// 修改后示例
const chat = useCallback(async (message: string) => {
  return await agentApi.chat(message)
}, [])

const chatStream = useCallback(async function* (
  message: string,
  sessionId: string
) {
  const stream = agentApi.chatStream(message, sessionId, abortSignal)
  for await (const chunk of stream) {
    yield chunk
  }
}, [])
```

**优点**：
- 保持向后兼容，所有使用 `useAgentApi` 的组件无需修改
- 减少代码重复，逻辑统一在 `agentApi` 中
- Hook 可以标记为 `@deprecated`，引导开发者使用新的 API

---

#### `src/renderer/components/agent/ChatPanel.tsx`

**类型导入更新**：
```typescript
import {
  useAgentApi,
  getSessionId,
  type ChatResponse,
} from '~/renderer/hooks/useAgentApi'

// 新增流式响应类型
interface StreamDoneData {
  response?: string
  action_taken?: ChatResponse['action_taken']
  requires_confirmation?: boolean
  confirmation_id?: string
  confirmation_message?: string
  risk_level?: string
  session_id?: string
}
```

**类型安全改进**：
```typescript
// 流式完成
const doneData = chunk.data as StreamDoneData | null
requiresConfirmation = doneData?.requires_confirmation || false
```

---

#### `src/renderer/components/agent/SessionSidebar.tsx`

**类型导入更新**：
```typescript
import {
  useAgentApi,
  getSessionHistory,
  type SessionSummary,
} from '~/renderer/hooks/useAgentApi'
```

**API 调用更新**：
```typescript
// 修改前：backendSessions.sessions || []
// 修改后：backendSessions
const backendSessions = await getSessions()
for (const session of backendSessions) {
  // ...
}
```

---

#### `src/renderer/pages/agent/AgentPage.tsx`

**类型导入更新**：
```typescript
import { useAgentApi, type ChatResponse } from '~/renderer/hooks/useAgentApi'

interface StreamDoneData {
  // 流式响应 done chunk 类型
}
```

**API 调用更新**：
```typescript
// 修改前：data.sessions || []
// 修改后：data || []
const data = await getSessions()
setSessions(data || [])
```

---

## API 返回类型修复

### 问题

`getSessions()` 的返回类型从 `{ sessions: SessionSummary[] }` 改为 `SessionSummary[]`

### 原因

API 响应格式为 `{ code, message, data }`，而 `data.sessions` 是多余的中转

### 修复

```typescript
// backend/api/agent.py 返回
return success_response(data={"sessions": [...]})

// frontend 修改前
return result.data.sessions || []

// frontend 修改后
return (result.data as SessionsResponse).sessions || []
```

---

## 类型安全增强

### 流式响应类型

定义了 `StreamDoneData` 接口，包含 `risk_level` 字段（`ChatResponse` 中没有此字段）：

```typescript
interface StreamDoneData {
  response?: string
  action_taken?: ChatResponse['action_taken']
  requires_confirmation?: boolean
  confirmation_id?: string
  confirmation_message?: string
  risk_level?: string  // 仅在流式响应中返回
  session_id?: string
}
```

---

## 代码质量检查

所有检查通过：
```bash
pnpm typecheck  # TypeScript 类型检查通过
pnpm lint       # Biome 代码格式检查通过
```

---

## 向后兼容性

- ✅ 所有使用 `useAgentApi` 的组件无需修改
- ✅ API 和类型导出保持兼容
- ✅ 会话管理辅助函数正常导出

---

## 使用示例

### 新 API 使用方式（推荐）

```typescript
import { agentApi } from '~/renderer/api/agent'

// 发送消息
const response = await agentApi.chat('帮我写一篇日记')

// 流式消息
for await (const chunk of agentApi.chatStream('你好')) {
  if (chunk.type === 'content') {
    console.log(chunk.data)
  }
}

// 会话管理
const sessionId = agentApi.getCurrentSessionId()
agentApi.switchSession('sess_new')
agentApi.createSession()
```

### 原有 Hook 使用方式（兼容）

```typescript
import { useAgentApi } from '~/renderer/hooks/useAgentApi'

function Component() {
  const { chat, chatStream, createSession } = useAgentApi()
  // ...
}
```

---

## 重构收益

1. **代码组织更清晰**：API 封装与业务逻辑分离
2. **类型定义更完善**：完整的 TypeScript 类型支持
3. **向后兼容**：现有组件无需修改
4. **易于维护**：单一职责，API 逻辑集中在 `agent.ts`
5. **风格统一**：与项目中其他 API 模块保持一致

---

## 后续优化建议

1. **迁移指南**：在新代码中优先使用 `agentApi`，逐步迁移旧代码
2. **测试覆盖**：为新的 API 封装添加单元测试
3. **文档更新**：在代码注释中添加更详细的使用说明
4. **类型共享**：考虑将 `StreamDoneData` 等类型移到 `agent.ts` 中统一导出
