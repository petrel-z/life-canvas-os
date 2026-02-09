# 首次启动自动初始化机制

## 问题

用户首次安装应用时，本地没有数据库，会不会报错？

## 答案

**不会报错！** 后端已经实现了自动初始化机制。

---

## 自动初始化流程

### 1. 应用启动时（`main.py`）

应用启动时会自动执行以下检查：

```python
@app.on_event("startup")
async def startup_event():
    # 1. 检查数据库是否存在
    # 2. 如果不存在，自动创建表
    # 3. 自动创建默认用户
    # 4. 自动创建 8 个生命平衡系统
```

### 2. 启动日志示例

**首次启动**:
```
==================================================
Life Canvas OS Backend Starting...
==================================================
[INFO] No database tables found. Initializing database...
[INFO] Creating database tables...
[OK] Created default user: Owner
[OK] Created default user settings
[OK] Initialized 8 life balance systems: FUEL, PHYSICAL, INTELLECTUAL, OUTPUT, RECOVERY, ASSET, CONNECTION, ENVIRONMENT

[SUCCESS] Database initialization completed!
[OK] Database auto-initialized on first run
[OK] Database connection established
[INFO] Pool status: {'size': 5, 'checked_in': 1, 'checked_out': 0}
==================================================
```

**后续启动**:
```
==================================================
Life Canvas OS Backend Starting...
==================================================
[OK] Database connection established
[INFO] Pool status: {'size': 5, 'checked_in': 1, 'checked_out': 0}
==================================================
```

---

## 初始化的数据

### 默认用户
- **用户名**: Owner
- **显示名**: 用户
- **主题**: dark
- **PIN 码**: 未设置（需要用户首次设置）

### 默认设置
- **主题**: dark
- **语言**: zh-CN
- **自动保存**: 60 秒
- **通知**: 开启
- **年份进度**: 显示
- **星期显示**: 显示

### 默认系统
8 个生命平衡系统，初始评分均为 50：
1. FUEL（饮食系统）
2. PHYSICAL（运动系统）
3. INTELLECTUAL（智力系统）
4. OUTPUT（输出系统）
5. RECOVERY（恢复系统）
6. ASSET（资产系统）
7. CONNECTION（连接系统）
8. ENVIRONMENT（环境系统）

---

## 手动初始化

如果需要手动重置数据库：

```bash
# 方法 1: 运行初始化脚本
python -m backend.db.init_db

# 方法 2: 删除数据库文件后重启应用
rm life_canvas.db
python -m backend.main --dev
```

---

## 测试首次启动

```bash
# 运行测试脚本
python backend/tests/test_first_startup.py
```

---

## 生产环境（Electron）

在生产环境中，数据库文件存储位置：

- **Windows**: `%APPDATA%/life-canvas-os/life_canvas.db`
- **macOS**: `~/Library/Application Support/life-canvas-os/life_canvas.db`
- **Linux**: `~/.config/life-canvas-os/life_canvas.db`

应用会自动在用户数据目录创建数据库。

---

## 数据迁移

如果应用升级时需要修改数据库结构，使用 Alembic 迁移：

```bash
# 创建迁移脚本
alembic revision --autogenerate -m "Add new feature"

# 执行迁移
alembic upgrade head
```

---

## 常见问题

### Q: 数据库文件在哪里？
A:
- 开发环境：项目根目录 `life_canvas.db`
- 生产环境：用户数据目录（见上文）

### Q: 如何重置所有数据？
A: 删除数据库文件后重启应用即可自动重新初始化

### Q: 升级应用会丢失数据吗？
A: 不会。数据库文件会保留，只会在首次启动时创建

### Q: 如何备份数据？
A: 使用 `POST /api/data/backup/create` 接口创建备份
