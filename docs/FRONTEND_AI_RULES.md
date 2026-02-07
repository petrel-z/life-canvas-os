# Life Canvas OS - 前端 AI 编码准则

本文档专为前端开发设计，提炼自 `STANDARDS.md`，旨在确保 React/TypeScript 代码的一致性和高质量。

## 1. 技术栈

- **核心框架**: React 19, TypeScript, Vite
- **运行环境**: Electron
- **样式方案**: TailwindCSS, shadcn/ui, clsx, tailwind-merge
- **状态管理**:
  - 服务端: TanStack Query (必须)
  - 全局: Zustand
  - 本地: React Hooks
- **路由**: React Router v6 (HashRouter)
- **测试**: Vitest (单元测试), Playwright (E2E)
- **工具链**: Biome (格式化/Lint)

## 2. 命名规范

- **文件/目录**: `kebab-case` (例: `user-profile.tsx`, `use-auth.ts`, `components/ui/button.tsx`)
- **组件/接口/类型**: `PascalCase` (例: `UserProfile`, `User`, `AuthResponse`)
- **变量/函数/Hooks**: `camelCase` (例: `isLoading`, `fetchUser`, `useTheme`)
- **常量**: `UPPER_SNAKE_CASE` (例: `MAX_RETRY_COUNT`, `DEFAULT_THEME`)
- **Prop 类型命名**: `组件名 + Props` (例: `UserCardProps`)

## 3. TypeScript 规范

- **类型定义**:
  - 对象结构优先使用 `interface`。
  - 联合类型、交叉类型或简单别名使用 `type`。
- **导入**: 优先使用 `import type` 导入类型 (例: `import type { User } from '~/shared/types'`)。
- **严格模式**: 严禁隐式 `any`，必须定义明确类型。
- **断言**: 慎用 `as`，优先使用类型守卫 (Type Guards) 或断言函数。
- **枚举**: 优先使用联合字面量类型 (`type Status = 'active' | 'inactive'`) 而非 `enum`。

## 4. 组件开发规范

### 4.1 结构模板

```typescript
// 1. Imports (React -> Libs -> Components -> Internal -> Types -> Styles)
import { useState } from 'react'
import { clsx } from 'clsx'
import type { User } from '~/shared/types'

// 2. Props Interface (必须导出)
export interface UserCardProps {
  user: User
  className?: string
  // 事件回调命名以 on 开头
  onEdit?: (user: User) => void
}

// 3. Component (函数式组件)
export function UserCard({ user, className, onEdit }: UserCardProps) {
  // Logic...
  return (
    <div className={clsx('rounded-md border p-4', className)}>
      {/* ... */}
    </div>
  )
}
```

### 4.2 最佳实践

- **组合优先**: 使用 `children` prop 进行组合，而非传递复杂配置对象。
- **展示与容器分离**:
  - **展示组件**: 纯 UI，无副作用，依赖 props 渲染。
  - **容器组件**: 处理数据获取 (React Query)、业务逻辑和状态分发。
- **Hooks 顺序**: `useState` -> `useRef` -> `useEffect` -> Custom Hooks。
- **Props**: 总是解构 props，为可选 props 提供默认值。

## 5. 状态管理规范

- **服务端状态 (Server State)**: **必须**使用 `TanStack Query`。
  - 禁止将 API 数据手动存入 `useState` 或 `Zustand`，除非需要进行复杂的客户端转换。
- **UI 状态 (Local State)**: 使用 `useState` 或 `useReducer`。
- **全局状态 (Global State)**: 使用 `Zustand`。仅用于跨组件共享的非 API 数据（如主题、侧边栏开关、用户信息）。

## 6. 样式规范 (Tailwind)

- **工具类**: 使用 `cn()` 工具函数 (`clsx` + `tailwind-merge`) 合并类名，确保外部传入的 `className` 可以覆盖内部样式。
- **响应式**: 移动优先 (`w-full md:w-1/2`)。
- **主题**: 使用 CSS 变量 (如 `bg-primary`, `text-foreground`) 适配深色模式。
- **避免**: 避免在 JSX 中写内联 `style`，除非是动态计算的值 (如坐标)。

## 7. 路径与导入

- **别名**: 使用 `~/` 指向 `src/` 目录。
- **绝对路径**: 禁止使用 `../../` 跨模块导入，必须使用绝对路径别名。
- **导入顺序**: 第三方库 -> 绝对路径组件 -> 相对路径。

## 8. 代码复杂度与规模 (Complexity Limits)

- **文件长度**: 单个文件原则上不超过 **300 行**。超过时必须拆分（如提取子组件、Hooks 或工具函数）。
- **函数长度**: 单个函数原则上不超过 **50 行**。
- **嵌套深度**: 避免超过 **3 层** 的逻辑嵌套。优先使用“卫语句” (Guard Clauses) 提前返回。
- **参数数量**: 函数参数不超过 **3 个**。超过时使用对象参数 (Interface)。

## 9. 错误处理与安全

- **API 错误**: 前端必须处理 API 的 loading 和 error 状态，给予用户反馈。
- **输入验证**: 表单提交前必须进行客户端验证 (推荐 React Hook Form + Zod)。
- **HTML 注入**: 禁止使用 `dangerouslySetInnerHTML`，除非绝对必要且经过清洗 (DOMPurify)。
- **敏感数据**: 严禁在前端代码中硬编码密钥。

## 10. 注释与文档

- **原则**: 注释解释 "为什么" (Why) 而不是 "做什么" (What)。
- **JSDoc**: 导出的组件、Hooks 和工具函数必须包含简要 JSDoc 说明。
- **TODO**: 使用 `// TODO: 说明` 标记未完成或待优化的逻辑。
