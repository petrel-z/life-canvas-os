# Life Canvas OS

> 基于八维量化模型的 AI 驱动个人成长桌面操作系统

<div align="center">


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-39.2.6-blue)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.2.1-blue)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.12-green)](https://www.python.org/)

**一个帮助你系统化管理、量化并优化个人生活的桌面应用**

[功能特性](#-核心特性) • [快速开始](#-快速开始) • [开发指南](#-开发指南) • [贡献](#-贡献)

</div>

---

## 📖 项目简介

Life Canvas OS 是一款创新的个人成长管理工具，基于**八维生命平衡模型**，帮助你：

- 🎯 **系统化管理**：将生活抽象为 8 个可量化的子系统
- 📊 **数据驱动**：通过量化评分和趋势分析辅助决策
- 🤖 **AI 洞察**：利用 AI 技术提供个性化分析和建议
- 🔒 **隐私优先**：数据完全存储在本地，你拥有完全控制权
- 🎨 **极简美学**：现代化的 UI 设计，提供沉浸式体验

### 🎯 八维生命平衡模型

1. **饮食系统 (FUEL)** - 追踪饮食习惯，保持健康基准
2. **运动系统 (PHYSICAL)** - 监控运动计划，维护身体活力
3. **读书系统 (INTELLECTUAL)** - 记录阅读进度，积累思想火花
4. **工作系统 (OUTPUT)** - 管理工作产出，追踪 OKR 目标
5. **梦想系统 (RECOVERY)** - 设定并实现人生梦想
6. **财务系统 (ASSET)** - 管理资产和负债，实现财务自由
7. **社交系统 (CONNECTION)** - 维护人际关系，提升社交能量
8. **环境系统 (ENVIRONMENT)** - 优化生活空间，创建理想环境

---

## ✨ 核心特性

### 当前已实现 ✅

**基础架构：**
- **跨平台桌面应用** - 基于 Electron，支持 macOS、Windows、Linux
- **现代化前端** - React 19 + TypeScript + Vite
- **Python 后端** - FastAPI + SQLite 双模式架构
- **进程管理** - 健康检查和自动重启机制
- **代码规范** - Biome 统一代码格式化

**用户系统：**
- **PIN 码认证** - 6 位数字快速锁定应用
- **用户配置** - 个人信息、生命周期、MBTI、价值观
- **设置管理** - AI 配置、外观设置、数据管理
- **本地缓存** - PIN 状态缓存（5分钟过期）

**AI 智能洞察：**
- **洞察生成** - 支持 DeepSeek/豆包/OpenAI
- **智能分类** - 自动分为：值得庆祝、需要关注、行动建议
- **横向展示** - 三列布局，颜色编码系统
- **历史记录** - 查看历史洞察详情
- **系统评分快照** - 八维评分可视化

**用户日记：**
- **日记 CRUD** - 创建、编辑、删除、查看
- **心情记录** - 5 档心情选择
- **系统关联** - 关联 8 个子系统
- **Markdown 支持** - 富文本编辑
- **私密日记** - PIN 码保护

**数据管理：**
- **数据导出** - JSON/ZIP 格式导出
- **数据导入** - 支持导入历史数据
- **数据备份** - 一键备份所有数据
- **时间轴审计** - 完整的操作记录
- **进度追踪** - 实时显示导入/导出进度

**性能优化：**
- **按需加载** - 设置页面按 Tab 加载数据
- **防止重复调用** - 使用 useRef 防止 StrictMode 双重调用
- **代码重构** - 统一工具函数，消除重复代码
- **本地缓存** - 减少不必要的 API 调用

### 规划中 🔜

- **八维评分系统** - 可视化雷达图展示
- **8 个子系统 CRUD** - 完整的子系统管理
- **数据可视化** - 趋势图表、统计分析
- **AI 对话功能** - 实时对话获取建议
- **移动端适配** - 响应式布局优化
- **主题系统** - 多主题切换

> **注意：** 项目处于活跃开发阶段（约 35% 完成）。详细的实现进度请查看 [docs/STRUCTURE_AUDIT.md](./docs/STRUCTURE_AUDIT.md)

---

## 🛠️ 技术栈

### 前端技术

| 技术 | 版本 | 说明 |
|------|------|------|
| [Electron](https://www.electronjs.org/) | 39.2.6 | 跨平台桌面应用框架 |
| [React](https://react.dev/) | 19.2.1 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | 5.9.3 | 类型安全 |
| [Vite](https://vitejs.dev/) | 7.2.6 | 快速构建工具 |
| [TailwindCSS](https://tailwindcss.com/) | 4.1.17 | 原子化 CSS 框架 |
| [shadcn/ui](https://ui.shadcn.com/) | Latest | 高质量 React 组件 |
| [TanStack Query](https://tanstack.com/query) | 5.90.20 | 服务端状态管理 |
| [Recharts](https://recharts.org/) | 3.7.0 | 数据可视化 |

### 后端技术

| 技术 | 版本 | 说明 |
|------|------|------|
| [Python](https://www.python.org/) | 3.12+ | 后端服务语言 |
| [FastAPI](https://fastapi.tiangolo.com/) | 0.104.1+ | 高性能异步 API 框架 |
| [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0.23+ | Python ORM |
| [Pydantic](https://docs.pydantic.dev/) | 2.5.0+ | 数据验证 |
| [SQLite](https://www.sqlite.org/) | 3 | 嵌入式数据库 |

### 开发工具

- **Biome 2.3.8** - 代码格式化和检查
- **electron-builder 26.0.12** - 应用打包
- **tsx 4.21.0** - TypeScript 执行

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **Python** >= 3.12
- **pnpm** >= 8.0.0（推荐）或 npm >= 9.0.0

### 安装步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/your-org/life-canvas-os.git
cd life-canvas-os
```

#### 2. 安装前端依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

#### 3. 设置 Python 环境

```bash
# 创建 Python 虚拟环境
python3 -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 安装 Python 依赖（待添加 requirements.txt）
# pip install -r backend/requirements.txt
```

#### 4. 启动开发服务器

```bash
# 启动 Electron 开发模式
pnpm dev

# 或使用 npm
npm run dev
```

应用将自动启动并打开开发窗口。

---

## 💻 开发指南

### 项目结构

```
life-canvas-os/
├── backend/                 # Python 后端
│   ├── api/                # API 路由
│   │   ├── auth.py        # PIN 认证
│   │   ├── users.py       # 用户配置
│   │   ├── journals.py    # 用户日记
│   │   ├── insights.py    # AI 洞察
│   │   ├── systems.py     # 系统数据
│   │   ├── timeline.py    # 时间轴审计
│   │   └── data.py        # 数据管理
│   ├── core/               # 核心逻辑
│   │   ├── config.py      # 配置管理
│   │   ├── exceptions.py  # 异常处理
│   │   ├── logging.py     # 日志系统
│   │   └── middleware.py  # 中间件
│   ├── models/             # 数据模型
│   │   ├── user.py        # 用户模型
│   │   ├── diary.py       # 日记模型
│   │   ├── insight.py     # 洞察模型
│   │   └── dimension.py   # 维度模型
│   ├── schemas/            # Pydantic Schema
│   ├── services/           # 业务服务
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── journal_service.py
│   │   ├── insight_service.py
│   │   └── system_service.py
│   ├── db/                 # 数据库模块
│   │   ├── session.py     # 会话管理
│   │   ├── base.py        # Base 模型
│   │   └── init_db.py     # 初始化
│   └── main.py             # 应用入口
│
├── docs/                   # 项目文档
│   ├── REQUIREMENT.md      # 产品需求文档
│   ├── DESIGN.md           # 设计文档
│   ├── PROJECT_STANDARDS.md # 项目规范
│   ├── STRUCTURE_AUDIT.md  # 结构审计报告
│   ├── API.md              # API 文档
│   └── DEVELOPMENT_ROADMAP.md # 开发路线图
│
├── scripts/                # 构建和发布脚本
│
├── src/                    # 前端源代码
│   ├── main/               # Electron 主进程
│   │   ├── index.ts        # 主进程入口
│   │   ├── python/         # Python 进程管理
│   │   └── windows/        # 窗口管理
│   │
│   ├── preload/            # 预加载脚本
│   │   └── index.ts
│   │
│   ├── renderer/           # 渲染进程（React）
│   │   ├── components/     # React 组件
│   │   │   ├── ui/        # shadcn/ui 组件
│   │   │   ├── layout/    # 布局组件
│   │   │   ├── pin/       # PIN 相关组件
│   │   │   └── GlassCard.tsx
│   │   ├── hooks/         # 自定义 Hooks
│   │   │   ├── useUserApi.ts
│   │   │   ├── useAiApi.ts
│   │   │   ├── useDataApi.ts
│   │   │   └── usePinStatus.ts
│   │   ├── pages/         # 页面组件
│   │   │   ├── dashboard/   # 仪表盘
│   │   │   ├── settings/    # 设置
│   │   │   ├── journal/     # 日记
│   │   │   ├── timeline/    # 时间轴
│   │   │   ├── systems/     # 系统管理
│   │   │   └── insight/     # AI 洞察
│   │   ├── api/           # API 客户端
│   │   ├── lib/           # 工具库
│   │   │   ├── constants.ts
│   │   │   ├── cacheUtils.ts
│   │   │   ├── insightUtils.ts
│   │   │   └── ...
│   │   └── routes.tsx     # 路由配置
│   │
│   ├── shared/             # 共享模块
│   │   ├── constants.ts   # 常量定义
│   │   ├── types.ts       # TypeScript 类型
│   │   └── utils.ts       # 工具函数
│   │
│   ├── lib/electron-app/   # Electron 工具库
│   └── resources/          # 资源文件
│
├── .gitignore
├── package.json
├── tsconfig.json
├── biome.json
├── electron.vite.config.ts
└── README.md
```

### 开发命令

```bash
# 启动开发服务器
pnpm dev

# 构建项目
pnpm build

# 运行测试（待配置）
pnpm test

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 类型检查
pnpm typecheck

# 打包 Python 后端
pnpm build:python

# 完整构建（Python + Electron）
pnpm build:all

# 创建发布版本
pnpm release
```

### 代码规范

项目使用 **Biome** 进行代码格式化和检查：

```bash
# 格式化所有代码
pnpm format

# 检查代码规范
pnpm lint

# 自动修复问题
pnpm lint:fix
```

详细的开发规范请查看：[docs/PROJECT_STANDARDS.md](./docs/PROJECT_STANDARDS.md)

### 架构设计

- **设计文档**：[docs/DESIGN.md](./docs/DESIGN.md)
- **产品需求**：[docs/REQUIREMENT.md](./docs/REQUIREMENT.md)
- **实现状态**：[docs/STRUCTURE_AUDIT.md](./docs/STRUCTURE_AUDIT.md)

---

## 📊 当前实现状态

### ✅ 已完成（约 35%）

**前端架构：**
- [x] Electron + React 19 基础框架
- [x] TypeScript + Vite 配置
- [x] React Router 路由配置
- [x] shadcn/ui 组件库集成
- [x] TailwindCSS 样式系统
- [x] TanStack Query 状态管理

**主进程功能：**
- [x] 主进程入口和窗口管理
- [x] Python 进程管理器（带健康检查）
- [x] IPC 通信机制
- [x] 文件对话框集成

**后端 API：**
- [x] FastAPI 应用框架
- [x] SQLAlchemy ORM 配置
- [x] 统一响应格式
- [x] 健康检查接口

**认证系统：**
- [x] PIN 码设置/验证/修改/删除
- [x] 用户配置管理
- [x] PIN 状态本地缓存
- [x] 设置页面按需加载

**AI 洞察功能：**
- [x] AI 配置管理（DeepSeek/豆包/OpenAI）
- [x] API Key 验证
- [x] 洞察生成接口
- [x] 洞察详情展示（三列横向布局）
- [x] 洞察分类系统（庆祝/警告/行动）
- [x] 历史洞察列表
- [x] 历史洞察详情（路由状态传递）
- [x] 系统评分快照
- [x] 防止重复调用优化

**用户日记功能：**
- [x] 日记 CRUD 接口
- [x] 日记编辑器
- [x] 日记详情页
- [x] 心情记录（5档选择）
- [x] 系统关联（8个维度）
- [x] 私密日记（PIN保护）
- [x] 日记列表展示

**数据管理功能：**
- [x] 数据导出（JSON/ZIP）
- [x] 数据导入（支持历史数据）
- [x] 进度追踪（实时反馈）
- [x] 数据备份
- [x] 时间轴审计（操作记录）
- [x] IPC 文件保存

**性能优化：**
- [x] 代码重构（消除重复）
- [x] 本地缓存机制
- [x] 按需加载策略
- [x] 防止重复调用

### 🔴 待开发

**核心功能：**
- [ ] 8 个子系统 CRUD
- [ ] 系统评分录入界面
- [ ] 可视化雷达图
- [ ] 趋势分析图表

**增强功能：**
- [ ] AI 对话功能
- [ ] 数据统计分析
- [ ] 深色模式完整支持
- [ ] 响应式布局优化

详细的实现计划请查看：[docs/DESIGN.md#开发优先级建议](./docs/DESIGN.md)

---

## 🤝 贡献

我们欢迎所有形式的贡献！

### 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

**示例：**
```bash
git commit -m "feat(auth): add PIN code verification"
git commit -m "fix(api): handle database connection error"
git commit -m "docs(readme): update installation guide"
```

---

## 📝 开发路线图

### Phase 0: 基础设施 ✅
- [x] Electron + React + Python 框架
- [x] 基础目录结构
- [x] Python 进程管理
- [x] 代码规范配置

### Phase 1: 数据层 ✅
- [x] 数据库模型设计
- [x] 数据库初始化脚本
- [x] Pydantic schemas
- [x] 统一响应格式

### Phase 2: 后端 API ✅
- [x] PIN 认证系统
- [x] 用户配置 API
- [x] 用户日记 API
- [x] AI 洞察 API
- [x] 时间轴审计 API
- [x] 数据管理 API

### Phase 3: 前端基础 ✅
- [x] 路由配置
- [x] 布局组件
- [x] UI 组件库集成
- [x] 状态管理

### Phase 4: 核心功能 ✅
- [x] PIN 码认证流程
- [x] 用户设置页面
- [x] 日记编辑器
- [x] AI 洞察展示
- [x] 数据导入/导出

### Phase 5: 性能优化 ✅
- [x] 按需加载策略
- [x] 本地缓存机制
- [x] 防止重复调用
- [x] 代码重构优化

### Phase 6: 子系统管理 🔜
- [ ] 8 个子系统 CRUD
- [ ] 系统评分录入
- [ ] 可视化雷达图
- [ ] 趋势分析

### Phase 7: 高级功能 🔜
- [ ] AI 对话功能
- [ ] 数据统计分析
- [ ] 深色模式完善
- [ ] 响应式布局优化

---

## 📜 更新日志

### 2025-01 (最近更新)

#### 新功能 ✨
- **AI 洞察优化**
  - 三列横向布局（庆祝/警告/行动）
  - 颜色编码系统
  - 历史洞察详情页（路由状态传递）
  - 系统评分快照展示

- **PIN 状态缓存机制**
  - 本地缓存（5分钟过期）
  - 自动同步更新
  - 减少接口调用

- **设置页面优化**
  - 按需加载策略
  - 初始只加载用户信息
  - 切换 tab 时加载对应数据

#### 性能优化 🚀
- **防止重复调用**
  - 使用 useRef 防止 StrictMode 双重调用
  - InsightDetailPage 优化
  - InsightHistoryPage 优化

- **代码重构**
  - 创建 insightUtils.ts 工具库
  - 消除重复代码（120行 → 0行）
  - 统一配置管理
  - 图标映射解耦

#### Bug 修复 🐛
- 修复生成洞察接口传参方式（改为 body 传参）
- 修复 Buffer 未定义错误（改用 Uint8Array）
- 优化数据导入/导出进度追踪

---

## 📄 许可证

本项目采用 [MIT](./LICENSE) 许可证。

---

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://react.dev/) - UI 框架
- [FastAPI](https://fastapi.tiangolo.com/) - 现代化的 Python Web 框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 React 组件库
- [TailwindCSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

---
