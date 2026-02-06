# Life Canvas OS 开发待办清单

> 更新日期：2026-02-06
> 项目状态：Phase 0 已完成，Phase 1-6 待开发

---

## 📊 整体进度

```
Phase 0: ████████████████████ 100% (已完成)
Phase 1: ░░░░░░░░░░░░░░░░░░░░   0% (数据层)
Phase 2: ░░░░░░░░░░░░░░░░░░░░   0% (后端 API)
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0% (前端 UI)
Phase 4: ░░░░░░░░░░░░░░░░░░░░   0% (核心功能)
Phase 5: ░░░░░░░░░░░░░░░░░░░░   0% (高级功能)
Phase 6: ░░░░░░░░░░░░░░░░░░░░   0% (优化发布)
```

---

## 🔙 后端开发任务

### Phase 1: 数据层开发

#### ✅ 基础设施
- [x] Electron + React 框架搭建
- [x] Python 后端框架初始化
- [x] 基础目录结构创建

#### 🔜 数据库与模型
- [ ] **安装 Python 依赖**
  - [ ] 创建 `backend/requirements.txt`
  - [ ] 添加 FastAPI、Uvicorn、SQLAlchemy、Pydantic
  - [ ] 添加 passlib、cryptography（安全）
  - [ ] 添加 OpenAI SDK（AI 集成）
  - [ ] 安装并验证所有依赖

- [ ] **创建数据库配置模块** (`backend/core/database.py`)
  - [ ] 实现跨平台数据目录定位
  - [ ] 配置 SQLite 连接引擎
  - [ ] 实现 Session 工厂模式
  - [ ] 实现依赖注入函数 `get_db()`
  - [ ] 实现数据库初始化函数

- [ ] **创建用户模型** (`backend/models/user.py`)
  - [ ] UserProfile 表（id, pin_hash, display_name, birthday, mbti, values, life_expectancy, locked_at）
  - [ ] UserSettings 表（theme, language, auto_save_enabled, notification_enabled 等）
  - [ ] AIConfig 表（provider, api_key_enc, model_name）
  - [ ] 配置表关系（一对一）

- [ ] **创建系统模型** (`backend/models/system.py`)
  - [ ] SystemBase 公共表（id, user_id, type, score）
  - [ ] SystemFuel 饮食系统
  - [ ] SystemPhysical 运动系统
  - [ ] SystemIntellectual 智力系统
  - [ ] SystemOutput 输出系统
  - [ ] SystemRecovery 恢复系统
  - [ ] SystemAsset 资产系统
  - [ ] SystemConnection 连接系统
  - [ ] SystemEnvironment 环境系统
  - [ ] Log 日志表
  - [ ] ActionItem 行动项表

- [ ] **创建日记模型** (`backend/models/journal.py`)
  - [ ] UserJournal 表（title, content, mood, tags, related_system）
  - [ ] Insight 表（content, system_scores, provider_used）

- [ ] **创建 Pydantic Schemas**
  - [ ] 用户相关 Schemas（`backend/schemas/user.py`）
    - [ ] UserProfileBase, UserProfileCreate, UserProfileUpdate, UserProfileResponse
    - [ ] PINSetup, PINVerify, PINChange
  - [ ] 系统相关 Schemas（`backend/schemas/system.py`）
    - [ ] SystemBase, SystemCreate, SystemUpdate
    - [ ] SystemResponse, SystemDetailResponse

- [ ] **创建数据库初始化脚本** (`backend/db/init_db.py`)
  - [ ] 创建所有表结构
  - [ ] 创建默认用户（id=1）
  - [ ] 创建默认设置
  - [ ] 创建 8 个默认子系统
  - [ ] 测试初始化流程

- [ ] **创建模型包导出** (`backend/models/__init__.py`, `backend/schemas/__init__.py`)
  - [ ] 导出所有用户模型
  - [ ] 导出所有系统模型
  - [ ] 导出所有日记模型
  - [ ] 导出所有 Schemas

---

### Phase 2: API 开发

#### 🔑 安全模块
- [ ] **创建安全模块** (`backend/core/security.py`)
  - [ ] 实现 PIN 哈希函数（bcrypt）
  - [ ] 实现 PIN 验证函数
  - [ ] 实现 API Key 加密服务（Fernet）
  - [ ] 实现 API Key 解密服务
  - [ ] 单元测试

#### 🔌 API 路由
- [ ] **PIN 认证 API** (`backend/api/pin.py`)
  - [ ] POST /api/pin/setup - 设置 PIN
  - [ ] POST /api/pin/verify - 验证 PIN
  - [ ] POST /api/pin/change - 修改 PIN
  - [ ] POST /api/pin/lock - 锁定应用
  - [ ] 错误处理和状态码

- [ ] **系统数据 API** (`backend/api/system.py`)
  - [ ] GET /api/systems/ - 获取所有系统
  - [ ] GET /api/systems/{type} - 获取系统详情
  - [ ] PATCH /api/systems/{type}/score - 更新评分
  - [ ] POST /api/systems/{type}/logs - 添加日志
  - [ ] GET /api/systems/{type}/logs - 获取日志
  - [ ] POST /api/systems/{type}/actions - 添加行动项
  - [ ] PATCH /api/systems/{type}/actions/{id} - 更新行动项
  - [ ] DELETE /api/systems/{type}/actions/{id} - 删除行动项

- [ ] **用户配置 API** (`backend/api/user.py`)
  - [ ] GET /api/user/profile - 获取用户信息
  - [ ] PATCH /api/user/profile - 更新用户信息
  - [ ] GET /api/user/settings - 获取设置
  - [ ] PATCH /api/user/settings - 更新设置
  - [ ] POST /api/user/ai-config - 保存 AI 配置

- [ ] **日记 API** (`backend/api/journal.py`)
  - [ ] POST /api/journal - 创建日记
  - [ ] GET /api/journal - 获取日记列表（支持筛选）
  - [ ] GET /api/journal/{id} - 获取日记详情
  - [ ] PATCH /api/journal/{id} - 更新日记
  - [ ] DELETE /api/journal/{id} - 删除日记

- [ ] **AI 洞察 API** (`backend/api/insights.py`)
  - [ ] POST /api/insights/generate - 生成洞察
  - [ ] GET /api/insights - 获取洞察历史
  - [ ] GET /api/insights/latest - 获取最新洞察

#### 🚀 应用配置
- [ ] **更新主应用入口** (`backend/main.py`)
  - [ ] FastAPI 应用初始化
  - [ ] CORS 中间件配置
  - [ ] 注册所有路由
  - [ ] 实现开发模式（HTTP 服务器）
  - [ ] 实现生产模式（IPC 通信）
  - [ ] 健康检查端点

---

## 🎨 前端开发任务

### Phase 3: UI 基础设施

#### 📦 依赖安装
- [ ] **安装前端依赖**
  - [ ] lucide-react（图标库）
  - [ ] recharts（图表库）
  - [ ] class-variance-authority（样式变体）

#### 🛠️ 工具函数
- [ ] **创建 UI 工具函数** (`src/renderer/lib/utils.ts`)
  - [ ] cn() 函数（合并 Tailwind 类名）

#### 🧩 基础组件
- [ ] **Button 组件** (`src/renderer/components/ui/button.tsx`)
  - [ ] 变体：default, destructive, outline, secondary, ghost, link
  - [ ] 尺寸：sm, default, lg, icon

- [ ] **Input 组件** (`src/renderer/components/ui/input.tsx`)
  - [ ] 支持所有原生 input 属性
  - [ ] 统一样式

- [ ] **Card 组件** (`src/renderer/components/ui/card.tsx`)
  - [ ] Card, CardHeader, CardTitle, CardDescription
  - [ ] CardContent, CardFooter

- [ ] **Alert 组件** (`src/renderer/components/ui/alert.tsx`)
  - [ ] default 和 destructive 变体

- [ ] **其他基础组件**
  - [ ] Label 组件
  - [ ] Textarea 组件
  - [ ] Select 组件
  - [ ] Switch 组件
  - [ ] Tabs 组件

#### 📐 布局组件
- [ ] **Sidebar 组件** (`src/renderer/components/layout/sidebar.tsx`)
  - [ ] Logo 和标题显示
  - [ ] 导航菜单（全局画布、AI 洞察、时间轴、用户日记、系统设置）
  - [ ] 当前路径高亮
  - [ ] 响应式设计

- [ ] **AppLayout 组件** (`src/renderer/components/layout/app-layout.tsx`)
  - [ ] 集成 Sidebar
  - [ ] 路由监听
  - [ ] 主内容区域

#### 🛣️ 路由配置
- [ ] **更新路由配置** (`src/renderer/routes.tsx`)
  - [ ] HashRouter 配置
  - [ ] AppLayout 父路由
  - [ ] canvas 路由
  - [ ] insights 路由
  - [ ] history 路由
  - [ ] settings 路由
  - [ ] journal 路由
  - [ ] system/:type 路由
  - [ ] 默认重定向到 /canvas

---

### Phase 4: 核心功能实现

#### 🔐 认证功能
- [ ] **PIN 设置页面** (`src/renderer/pages/pin-setup-page.tsx`)
  - [ ] PIN 输入表单
  - [ ] 确认 PIN 输入
  - [ ] 实时验证（6 位数字）
  - [ ] API 调用
  - [ ] 错误处理
  - [ ] 成功后跳转

- [ ] **PIN 验证页面** (`src/renderer/pages/pin-verify-page.tsx`)
  - [ ] PIN 输入
  - [ ] API 验证
  - [ ] 错误重试
  - [ ] 验证成功解锁

#### 🎨 全局画布
- [ ] **SystemCard 组件** (`src/renderer/components/canvas/system-card.tsx`)
  - [ ] 显示系统名称和评分
  - [ ] +/- 按钮调整评分（±5）
  - [ ] 评分范围限制（0-100）
  - [ ] 进度条可视化
  - [ ] 颜色根据评分变化
  - [ ] API 同步

- [ ] **Canvas 页面** (`src/renderer/pages/canvas-page.tsx`)
  - [ ] 网格布局（2/4 列）
  - [ ] 显示 8 个系统卡片
  - [ ] 获取系统数据
  - [ ] 评分更新同步

#### ⚙️ 用户设置
- [ ] **Settings 页面** (`src/renderer/pages/settings-page.tsx`)
  - [ ] Tab 导航
  - [ ] **基本信息 Tab**
    - [ ] display_name 输入
    - [ ] birthday 日期选择
    - [ ] mbti 选择
    - [ ] values 输入
    - [ ] life_expectancy 滑块
  - [ ] **外观设置 Tab**
    - [ ] theme 选择（light/dark/auto）
    - [ ] language 选择
    - [ ] auto_save_enabled 开关
    - [ ] notification_enabled 开关
    - [ ] show_year_progress 开关
    - [ ] show_weekday 开关
  - [ ] **AI 配置 Tab**
    - [ ] provider 选择
    - [ ] api_key 输入（加密）
    - [ ] model_name 输入
  - [ ] **安全设置 Tab**
    - [ ] 修改 PIN 功能

---

### Phase 5: 高级功能

#### 🤖 AI 洞察
- [ ] **Insights 页面** (`src/renderer/pages/insights-page.tsx`)
  - [ ] 显示最新洞察
  - [ ] 手动生成按钮
  - [ ] 历史洞察列表
  - [ ] 洞察详情查看

#### 📝 用户日记
- [ ] **Journal 页面** (`src/renderer/pages/journal-page.tsx`)
  - [ ] 日记列表
  - [ ] 按日期筛选
  - [ ] 按情绪筛选
  - [ ] 按系统筛选
  - [ ] 新建日记按钮

- [ ] **Journal 编辑器** (`src/renderer/pages/journal-editor-page.tsx`)
  - [ ] Markdown 编辑器
  - [ ] 标题输入
  - [ ] 情绪选择
  - [ ] 关联系统选择
  - [ ] 标签输入
  - [ ] 保存/更新

#### 📊 数据可视化
- [ ] **History 页面** (`src/renderer/pages/history-page.tsx`)
  - [ ] 系统评分趋势图（折线图）
  - [ ] 情绪分布图（饼图）
  - [ ] 时间轴审计（甘特图）
  - [ ] 日期范围选择

---

### Phase 6: 优化与发布

#### ⚡ 性能优化
- [ ] **前端优化**
  - [ ] 代码分割
  - [ ] 懒加载
  - [ ] 缓存策略
  - [ ] 图片优化

- [ ] **后端优化**
  - [ ] 查询优化
  - [ ] 索引优化
  - [ ] 连接池配置

- [ ] **Electron 优化**
  - [ ] 启动速度优化
  - [ ] 资源占用优化
  - [ ] 打包体积优化

#### 📦 打包配置
- [ ] **macOS 打包**
  - [ ] .dmg 安装包配置
  - [ ] 代码签名
  - [ ] 公证

- [ ] **Windows 打包**
  - [ ] .exe 安装包配置
  - [ ] 代码签名

- [ ] **Linux 打包**
  - [ ] .AppImage 配置

#### 🔄 自动更新
- [ ] **electron-updater 集成**
  - [ ] 更新服务器配置
  - [ ] 版本检查
  - [ ] 增量更新
  - [ ] 更新提示 UI

---

## 🔗 相关文档

- [API 接口文档](./API.md)
- [项目规范](./PROJECT_STANDARDS.md)
- [设计文档](./DESIGN.md)
