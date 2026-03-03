# GitHub CI/CD 配置指南

## 1. 启用 GitHub Actions

### 1.1 检查 Actions 权限

1. 进入你的 GitHub 仓库
2. 点击 `Settings` (设置)
3. 左侧菜单选择 `Actions` → `General`
4. 确保以下设置：
   - **Actions permissions**: 选择 `Allow all actions and reusable workflows`
   - **Workflow permissions**: 选择 `Read and write permissions`
   - 勾选 `Allow GitHub Actions to create and approve pull requests`

### 1.2 保存设置

点击页面底部的 `Save` 按钮保存配置。

## 2. 配置 Secrets（可选）

如果需要使用第三方服务（如代码签名），需要配置 Secrets：

1. 进入 `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`
3. 添加需要的密钥

**注意**: `GITHUB_TOKEN` 是自动提供的，无需手动配置。

## 3. 发布第一个版本

### 3.1 更新版本号

编辑 `package.json`，修改版本号：

```json
{
  "version": "0.0.2"
}
```

### 3.2 提交并推送

```bash
# 提交更改
git add package.json
git commit -m "chore: 发布 v0.0.2 版本"
git push origin main

# 创建标签
git tag v0.0.2
git push origin v0.0.2
```

### 3.3 查看构建进度

1. 进入仓库的 `Actions` 标签页
2. 可以看到 `发布应用` workflow 正在运行
3. 点击进入查看详细日志

### 3.4 查看 Release

构建完成后：

1. 进入仓库的 `Releases` 页面
2. 可以看到新创建的 Release
3. 下载对应平台的安装包

## 4. Workflow 说明

### 4.1 发布 Workflow (`release.yml`)

**触发条件**: 推送以 `v` 开头的标签（如 `v1.0.0`）

**执行内容**:
- 在 macOS、Linux、Windows 三个平台并行构建
- 构建 Python 后端可执行文件
- 打包 Electron 应用
- 自动创建 GitHub Release
- 上传构建产物

### 4.2 构建测试 Workflow (`build.yml`)

**触发条件**: 
- 推送到 `main`、`master` 或 `develop` 分支
- 创建 Pull Request

**执行内容**:
- 代码风格检查
- TypeScript 类型检查
- 多平台构建测试（不发布）

### 4.3 发布说明 Workflow (`release-notes.yml`)

**触发条件**: Release 发布后

**执行内容**:
- 自动生成变更日志
- 根据 commit message 分类变更
- 更新 Release 说明

## 5. 构建产物说明

发布完成后，每个平台会生成以下文件：

### macOS
- `life-canvas-os-v0.0.2-mac.dmg` - DMG 安装包
- `life-canvas-os-v0.0.2-mac.zip` - ZIP 压缩包

### Linux
- `life-canvas-os-v0.0.2-linux.AppImage` - AppImage 格式
- `life-canvas-os-v0.0.2-linux.deb` - Debian/Ubuntu 包
- `life-canvas-os-v0.0.2-linux.rpm` - RedHat/Fedora 包
- `life-canvas-os-v0.0.2-linux.pacman` - Arch Linux 包

### Windows
- `life-canvas-os-v0.0.2-win.exe` - 便携版
- `life-canvas-os-v0.0.2-win.zip` - ZIP 压缩包

## 6. 常见问题

### 6.1 构建失败

**检查步骤**:
1. 查看 Actions 日志，找到具体错误信息
2. 确认 `backend/requirements.txt` 中的依赖都能正常安装
3. 确认 `backend.spec` 配置正确
4. 本地测试构建：`pnpm build:all`

### 6.2 Release 未自动创建

**可能原因**:
- 标签名称不是以 `v` 开头
- Actions 权限不足（检查第 1 步）
- Workflow 执行失败（查看 Actions 日志）

### 6.3 Python 后端构建失败

**解决方案**:
```bash
# 本地测试 Python 构建
cd backend
pip install -r requirements.txt
pip install pyinstaller
python -m PyInstaller backend.spec --clean
```

如果本地构建成功但 CI 失败，可能是平台差异导致，需要检查依赖兼容性。

## 7. 版本发布流程

### 标准流程

```bash
# 1. 确保在主分支
git checkout main
git pull origin main

# 2. 更新版本号
# 编辑 package.json 中的 version 字段

# 3. 提交版本更新
git add package.json
git commit -m "chore: 发布 v0.0.3 版本"

# 4. 创建标签
git tag v0.0.3

# 5. 推送到远程
git push origin main
git push origin v0.0.3

# 6. 等待 CI/CD 完成
# 访问 GitHub Actions 查看进度
```

### 快速发布脚本

可以创建一个脚本简化流程：

```bash
#!/bin/bash
# scripts/release.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "用法: ./scripts/release.sh v0.0.3"
  exit 1
fi

# 更新 package.json
npm version ${VERSION#v} --no-git-tag-version

# 提交并打标签
git add package.json
git commit -m "chore: 发布 $VERSION 版本"
git tag $VERSION

# 推送
git push origin main
git push origin $VERSION

echo "✅ 版本 $VERSION 已推送，请访问 GitHub Actions 查看构建进度"
```

使用方法：
```bash
chmod +x scripts/release.sh
./scripts/release.sh v0.0.3
```

## 8. 监控和通知

### 8.1 邮件通知

GitHub 会自动发送 Actions 执行结果到你的邮箱。

### 8.2 Slack/Discord 通知（可选）

如需集成通知，可以在 workflow 中添加通知步骤：

```yaml
- name: 发送通知
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 9. 下一步

- ✅ 配置完成后，推送一个测试标签验证流程
- ✅ 查看生成的 Release 和构建产物
- ✅ 下载并测试各平台的安装包
- ✅ 根据需要调整 workflow 配置

## 10. 参考资源

- [GitHub Actions 文档](https://docs.github.com/cn/actions)
- [electron-builder 文档](https://www.electron.build/)
- [PyInstaller 文档](https://pyinstaller.org/)
