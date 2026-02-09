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

## ⚠️ 注意事项

### 禁止事项

1. **禁止使用 `any` 类型**

   ```typescript
   // ❌ 错误
   const data: any = await api.getUser();

   // ✅ 正确
   const data: User = await api.getUser();
   ```

2. **禁止忽略类型错误**
   - 使用 `// @ts-ignore` 或 `// @ts-expect-error` 必须说明原因

3. **禁止在组件中直接调用 API**

   ```typescript
   // ❌ 错误：组件中直接调用 fetch/axios
   const response = await fetch("/api/user");

   // ✅ 正确：使用 Service 层 + React Query
   // queries/useUserQuery.ts
   export const useUserQuery = () => {
     return useQuery({
       queryKey: ['user'],
       queryFn: userService.getCurrentUser
     });
   };
   ```

4. **禁止硬编码配置**

   ```typescript
   // ❌ 错误
   const apiUrl = "http://localhost:8000";

   // ✅ 正确
   const apiUrl = import.meta.env.RENDERER_VITE_API_URL;
   ```

5. **禁止直接使用 Node.js API**
   - 渲染进程禁止直接使用 `fs`, `path` 等 Node 模块
   - 必须通过 `window.electron` 或 `preload` 脚本暴露的安全 API 进行通信

### 必须遵守

1. **所有副作用处理必须规范化**

   ```typescript
   // ✅ 使用 useEffect 处理副作用
   useEffect(() => {
     const subscription = dataSource.subscribe();
     return () => {
       subscription.unsubscribe(); // 必须清理
     };
   }, [dataSource]);
   ```

2. **组件 Props 必须定义类型**

   ```typescript
   interface Props {
     title: string;
     count?: number;
     children?: React.ReactNode;
   }

   export function Card({ title, count = 0, children }: Props) {
     return (
       <div>
         <h1>{title} ({count})</h1>
         {children}
       </div>
     );
   }
   ```

3. **状态管理分层**
   - **服务端状态**: 必须使用 `@tanstack/react-query`
   - **全局 UI 状态**: 使用 `React Context` (如 `AppContext`)
   - **局部状态**: 使用 `useState` / `useReducer`
   - **表单状态**: 使用 `react-hook-form` + `zod`

4. **IPC 通信规范**
   - 渲染进程 -> 主进程: 使用 `window.electron.ipcRenderer.invoke` (异步)
   - 主进程 -> 渲染进程: 使用 `mainWindow.webContents.send`
   - 类型定义: 必须在 `src/shared/types.ts` 中定义 IPC 消息载荷类型

---

## 🔍 代码审查规范

所有代码提交前必须经过 Code Review，审查内容包括：

### 1. 命名是否符合领域语言

**检查要点**：

- ✅ 变量名、函数名、组件名是否符合业务领域语言
- ✅ 是否使用专业术语而非技术实现细节
- ✅ Custom Hooks 必须以 `use` 开头

**示例**：

```typescript
// ✅ 正确
const useSubmitOrder = () => {};
const [isLoggedIn, setIsLoggedIn] = useState(false);

// ❌ 错误
const submitDataFunction = () => {};
const [flag, setFlag] = useState(false);
```

### 2. 是否遵循项目分层结构

**检查要点**：

- ✅ **Components**: 只负责 UI 渲染 (`src/renderer/components`)
- ✅ **Pages**: 负责页面级逻辑 (`src/renderer/pages`)
- ✅ **Hooks/Queries**: 负责业务逻辑复用 (`src/renderer/hooks`)
- ✅ **Services**: 负责 API 请求封装 (`src/renderer/services` 或 `src/lib`)
- ✅ **Shared**: 负责前后端共享类型 (`src/shared`)

### 3. 是否有冗余或硬编码

**检查要点**：

- ✅ 样式是否使用 Tailwind CSS Utility Classes
- ✅ **Tailwind 类名是否排序** (建议遵循 布局 -> 盒模型 -> 视觉 的顺序，或使用 prettier 插件)
- ✅ 复杂逻辑是否提取为 Custom Hook
- ✅ 常量是否提取到 `constants.ts`

**示例**：

```typescript
// ✅ 正确 - 使用 Tailwind
<div className="p-4 bg-white rounded-lg shadow-md">

// ❌ 错误 - 内联样式或硬编码颜色
<div style={{ padding: '16px', backgroundColor: '#fff' }}>
```

### 4. 性能优化检查

**检查要点**：

- ✅ 昂贵的计算是否使用了 `useMemo`
- ✅ 传递给子组件的回调是否使用了 `useCallback`
- ✅ 列表渲染是否使用了正确的 `key` (禁止使用 index 作为 key)
- ✅ 大型列表是否使用了虚拟滚动

### 代码审查清单

提交代码前，请确认以下内容：

#### 代码质量

- [ ] 代码通过 Biome 检查 (`pnpm lint`)
- [ ] 代码通过 TypeScript 类型检查 (`pnpm typecheck`)
- [ ] 没有 `console.log` 或 `debugger`
- [ ] 依赖引用路径使用了别名 (如 `~/renderer/...`)

#### 命名规范

- [ ] 组件文件使用 PascalCase (e.g., `UserProfile.tsx`)
- [ ] Hook 文件使用 camelCase (e.g., `useAuth.ts`)
- [ ] 类型定义使用 PascalCase
- [ ] 常量使用 UPPER_SNAKE_CASE

#### 代码结构

- [ ] 单个文件建议不超过 300 行(UI 复杂组件除外)
- [ ] 单个组件函数建议不超过 100 行
- [ ] 核心业务逻辑函数建议不超过 50 行
- [ ] 嵌套层级不超过 3 层
- [ ] 循环复杂度不超过 10 (Switch 语句除外)
- [ ] `useEffect` 依赖项数组完整且正确
- [ ] 组件 Props 接口定义完整

#### Electron 安全与性能

- [ ] 确认没有在渲染进程开启 `nodeIntegration`
- [ ] IPC 通信没有传递敏感的完整对象（只传递 ID 或必要数据）
- [ ] 图片资源经过优化或懒加载
- [ ] 避免在渲染进程进行繁重的 CPU 计算（应放入 Web Worker 或 Python 后端）
