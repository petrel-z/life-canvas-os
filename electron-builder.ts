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

  directories: {
    app: getDevFolder(main),
    output: `dist/v${version}`,
  },

  // ✅ 关键配置：打包 Python 可执行文件
  // PyInstaller 输出：backend/dist/backend (单个可执行文件)
  // 打包后路径：Resources/python-runtime/backend
  extraResources: [
    {
      from: 'backend/dist/backend',
      to: 'python-runtime/backend',
      filter: ['**/*']
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
  },

  linux: {
    artifactName,
    category: 'Utility',
    synopsis: description,
    target: ['AppImage', 'deb', 'rpm'],
    icon: `${resources}/build/icons`,
  },

  win: {
    artifactName,
    icon: `${resources}/build/icons/icon.ico`,
    target: ['nsis', 'zip'],
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
}
