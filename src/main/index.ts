import { app, ipcMain, dialog } from 'electron'

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

    // 直接返回用户选择的原始文件完整路径
    const sourcePath = result.filePaths[0]
    console.log(`[IPC] Selected file: ${sourcePath}`)
    return { canceled: false, filePath: sourcePath }
  })

  // 导出数据 IPC handler - 保存文件到指定路径
  ipcMain.handle(
    'file:save-export-data',
    async (_event, fileData: Uint8Array, format: 'json' | 'zip') => {
      // 生成默认文件名
      const defaultFileName = `life_canvas_export_${new Date().toISOString().split('T')[0]}.${format}`

      // 让用户选择保存路径
      const result = await dialog.showSaveDialog({
        title: '选择导出文件保存位置',
        defaultPath: defaultFileName,
        filters: [
          {
            name: format === 'json' ? 'JSON 文件' : 'ZIP 压缩包',
            extensions: [format],
          },
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
    }
  )

  // 通用 API 请求处理程序 - 转发到 Python 后端
  ipcMain.handle(
    'api:request',
    async (_event, action: string, params: any = {}) => {
      console.log('[IPC] API request received:', action, params)
      try {
        const result = await pythonManager.sendRequest(action, params)
        console.log('[IPC] API request success:', action, result?.code)
        return { success: true, data: result }
      } catch (error) {
        console.error('[IPC] API request failed:', action, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

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
// 使用 before-quit 和 will-quit 双重保障
let isQuitting = false
let pythonStopped = false

/**
 * 强制清理所有 backend 进程（防止僵尸进程）
 * Windows: 使用 taskkill 终止所有 backend.exe 进程
 * macOS/Linux: 使用 pkill 终止所有 backend 进程
 */
async function forceCleanupBackendProcesses(): Promise<void> {
  const isWindows = process.platform === 'win32'
  const isMac = process.platform === 'darwin'

  if (isWindows) {
    return new Promise(resolve => {
      const { spawn } = require('node:child_process')
      console.log('[Main] Force cleaning up all backend.exe processes...')

      // 使用 taskkill 终止所有名为 backend.exe 的进程
      const taskkill = spawn('taskkill', ['/IM', 'backend.exe', '/F'], {
        stdio: 'ignore',
        detached: true,
      })

      taskkill.on('close', (code: number) => {
        console.log(`[Main] taskkill completed with code ${code}`)
        resolve()
      })

      taskkill.on('error', (err: Error) => {
        console.error('[Main] taskkill error:', err)
        resolve()
      })

      // 设置超时，防止卡住
      setTimeout(resolve, 3000)
    })
  }

  if (isMac) {
    return new Promise(resolve => {
      const { spawn } = require('node:child_process')
      console.log('[Main] Force cleaning up all backend processes...')

      // 使用 pkill 终止所有 backend 进程
      const pkill = spawn('pkill', ['-f', 'backend'], {
        stdio: 'ignore',
        detached: true,
      })

      pkill.on('close', (code: number) => {
        console.log(`[Main] pkill completed with code ${code}`)
        resolve()
      })

      pkill.on('error', (err: Error) => {
        console.error('[Main] pkill error:', err)
        resolve()
      })

      // 设置超时，防止卡住
      setTimeout(resolve, 3000)
    })
  }

  // Linux 或其他平台：使用 pkill
  return new Promise(resolve => {
    const { spawn } = require('node:child_process')
    console.log('[Main] Force cleaning up all backend processes...')

    const pkill = spawn('pkill', ['-f', 'backend'], {
      stdio: 'ignore',
      detached: true,
    })

    pkill.on('close', (code: number) => {
      console.log(`[Main] pkill completed with code ${code}`)
      resolve()
    })

    pkill.on('error', (err: Error) => {
      console.error('[Main] pkill error:', err)
      resolve()
    })

    setTimeout(resolve, 3000)
  })
}

app.on('before-quit', async event => {
  if (isQuitting) return

  // 在 macOS 上，preventDefault 可以阻止退出
  // 但我们只是确保 Python 进程在退出前被正确清理
  console.log('[Main] before-quit: Stopping Python backend...')

  try {
    // 给 Python 进程最多 5 秒时间优雅退出
    await pythonManager.stop(5000)
    pythonStopped = true
    console.log('[Main] Python backend stopped successfully')
  } catch (error) {
    console.error('[Main] Failed to stop Python backend:', error)
    // 如果正常停止失败，强制清理
    await forceCleanupBackendProcesses()
  }
})

// will-quit 作为备用保障（在所有窗口关闭后触发）
app.on('will-quit', async () => {
  if (isQuitting) return
  isQuitting = true

  console.log('[Main] will-quit: Ensuring Python backend is stopped')

  // 如果 before-quit 没有成功停止，在这里再次尝试
  if (!pythonStopped) {
    try {
      await pythonManager.stop(3000)
    } catch (err) {
      console.error('[Main] will-quit stop failed:', err)
    }

    // 最后的保障：强制清理所有 backend.exe
    await forceCleanupBackendProcesses()
  }
})

// 窗口全部关闭时的处理
app.on('window-all-closed', () => {
  console.log('[Main] All windows closed')

  // 在 macOS 上，应用通常不会退出（用户通常会按 Cmd+Q）
  // 但我们需要确保 Python 后端停止
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
