# 发布指南

## 自动发布流程

本项目使用 GitHub Actions 自动构建和发布应用。

### 发布新版本

1. 更新 `package.json` 中的版本号
2. 提交更改并推送到仓库
3. 创建并推送版本标签：

```bash
# 创建标签（版本号需要以 v 开头）
git tag v0.0.2

# 推送标签到远程仓库
git push origin v0.0.2
```

4. GitHub Actions 会自动：
   - 在 macOS、Linux、Windows 三个平台上构建应用
   - 构建 Python 后端可执行文件
   - 打包 Electron 应用
   - 创建 GitHub Release
   - 上传构建产物到 Release

### 构建产物

发布完成后，Release 页面会包含以下文件：

- **macOS**: `.dmg` 和 `.zip` 文件
- **Linux**: `.AppImage`、`.deb`、`.rpm` 等格式
- **Windows**: `.exe` 和 `.zip` 文件

### 持续集成

每次推送到主分支或创建 Pull Request 时，会自动运行构建测试：

- 代码风格检查（Biome）
- TypeScript 类型检查
- 多平台构建测试

## 手动构建

如需本地构建：

```bash
# 构建 Python 后端
pnpm build:python

# 构建 Electron 应用
pnpm build

# 完整构建
pnpm build:all
```

## 注意事项

- 版本标签必须以 `v` 开头（如 `v1.0.0`）
- 确保 `package.json` 中的版本号与标签一致
- 首次发布需要在 GitHub 仓库设置中启用 Actions
- Release 会自动使用标签名称和提交信息
