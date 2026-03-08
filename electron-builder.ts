/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: <> */
import packageJson from './package.json'

import { getDevFolder } from './src/lib/electron-app/release/utils/path'

const { main, name, version, resources, description, displayName } = packageJson
const author = typeof packageJson.author === 'string'
  ? packageJson.author
  : packageJson.author?.name ?? 'unknown'
const currentYear = new Date().getFullYear()
const authorInKebabCase = author.replace(/\s+/g, '-')
const appId = `com.${authorInKebabCase}.${name}`.toLowerCase()

const artifactName = [`${name}-v${version}`, '-${os}.${ext}'].join('')

export default {
  appId,
  productName: displayName,
  copyright: `Copyright © ${currentYear} — ${author}`,

  // 使用本地 Electron 缓存
  electronDist: 'node_modules/electron/dist/',

  directories: {
    app: getDevFolder(main),
    output: `dist/v${version}`,
  },

  // ✅ 关键配置：打包 Python 可执行文件
  // PyInstaller 输出：backend/dist/backend (单个可执行文件)
  // 打包后路径：Resources/python-runtime/backend (或 backend.exe on Windows)
  extraResources: [
    {
      from: 'backend/dist/',
      to: 'python-runtime/',
      filter: ['backend*']
    },
  ],

  // 确保打包所有必要文件
  files: [
    '**/*',
    '!backend/**/*',
    '!venv/**/*',
    '!.git/**/*',
    '!*.md',
  ],

  mac: {
    artifactName,
    icon: `${resources}/build/icons/icon.icns`,
    category: 'public.app-category.lifestyle',
    target: ['zip', 'dmg'],
    // ✅ 禁用硬运行时，因为无法签名
    hardenedRuntime: false,
    gatekeeperAssess: false,
    // ✅ 明确禁用代码签名（避免 "app 已损坏" 提示）
    identity: null,
  },

  // Linux 构建配置
  linux: {
    artifactName,
    category: 'Utility',
    synopsis: description,
    // ✅ 只构建 x64 架构，避免 app-builder 架构问题
    target: ['AppImage', 'deb'],
    icon: `${resources}/build/icons`,
  },

  win: {
    artifactName,
    icon: `${resources}/build/icons/icon.ico`,
    target: ['dir'],
    // 禁用所有签名相关操作
    sign: false,
  },

  // 禁用 asar 完整性检查（需要签名工具）
  asar: true,
  asarUnpack: '**/*.exe',

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
}
