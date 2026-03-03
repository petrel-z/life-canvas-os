import { app, ipcMain, dialog } from 'electron'
import { mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

import { makeAppWithSingleInstanceLock } from '~/lib/electron-app/factories/app/instance'
import { makeAppSetup } from '~/lib/electron-app/factories/app/setup'
import { loadReactDevtools } from '~/lib/electron-app/utils'
import { ENVIRONMENT } from '~/shared/constants'
import { MainWindow } from './windows/main'
import { waitFor } from '~/shared/utils'
import { pythonManager } from './python/manager'

// 防止 EPIPE 错误导致应用崩溃
const safeConsoleWrite = (fn: typeof console.log) => {
  return (...args: any[]) => {
    try {
      fn(...args)
    } catch (error) {
      // 忽略 EPIPE 错误
      if ((error as any)?.code !== 'EPIPE') {
        throw error
      }
    }
  }
}

console.error = safeConsoleWrite(console.error)
console.log = safeConsoleWrite(console.log)

makeAppWithSingleInstanceLock(async () => {
  // 启动 Python 后端进程
  console.log('[Main] Starting Python backend...')
  pythonManager.start()

  // 注册 IPC 处理程序
  ipcMain.handle('file:select-and-copy', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择备份文件',
      properties: ['openFile'],
      filters: [
        { name: '备份文件', extensions: ['zip', 'json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const sourcePath = result.filePaths[0]

    // 创建临时导入目录
    const tempImportDir = join(app.getPath('temp'), 'life-canvas-import')
    if (!existsSync(tempImportDir)) {
      mkdirSync(tempImportDir, { recursive: true })
    }

    // 复制文件到临时目录
    const fileName = sourcePath.split('/').pop() || 'backup.zip'
    const targetPath = join(tempImportDir, fileName)

    try {
      copyFileSync(sourcePath, targetPath)
      console.log(`[IPC] File copied from ${sourcePath} to ${targetPath}`)
      return { canceled: false, filePath: targetPath }
    } catch (error) {
      console.error('[IPC] Failed to copy file:', error)
      throw error
    }
  })

  // 导出数据 IPC handler - 保存文件到指定路径
  ipcMain.handle('file:save-export-data', async (_event, fileData: Uint8Array, format: 'json' | 'zip') => {

    // 生成默认文件名
    const defaultFileName = `life_canvas_export_${new Date().toISOString().split('T')[0]}.${format}`

    // 让用户选择保存路径
    const result = await dialog.showSaveDialog({
      title: '选择导出文件保存位置',
      defaultPath: defaultFileName,
      filters: [
        { name: format === 'json' ? 'JSON 文件' : 'ZIP 压缩包', extensions: [format] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    const savePath = result.filePath

    try {
      // 使用 Node.js fs 模块保存文件
      const { writeFile } = require('node:fs/promises')
      await writeFile(savePath, fileData)

      console.log(`[IPC] File saved to: ${savePath}`)
      return { canceled: false, filePath: savePath, success: true }
    } catch (error) {
      console.error('[IPC] Failed to save file:', error)
      throw error
    }
  })

  await app.whenReady()
  const window = await makeAppSetup(MainWindow)

  if (ENVIRONMENT.IS_DEV) {
    await loadReactDevtools()
    /* This trick is necessary to get the new
      React Developer Tools working at app initial load.
      Otherwise, it only works on manual reload.
    */
    window.webContents.once('devtools-opened', async () => {
      await waitFor(1000)
      window.webContents.reload()
    })
  }
})

// 应用退出时停止 Python 进程
app.on('before-quit', () => {
  console.log('[Main] Stopping Python backend...')
  pythonManager.stop()
})
