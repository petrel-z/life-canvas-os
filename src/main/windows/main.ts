import { BrowserWindow, app } from 'electron'
import { join } from 'node:path'

import { ENVIRONMENT } from 'shared/constants'

export async function MainWindow() {
  console.log('[MainWindow] Creating window...')

  const window = new BrowserWindow({
    title: 'Life Canvas OS',
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    x: 100,
    y: 100,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: false,
    titleBarStyle: 'default',
    backgroundColor: '#ffffff',

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  if (ENVIRONMENT.IS_DEV && process.env['ELECTRON_RENDERER_URL']) {
    await window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  console.log('[MainWindow] Window created, loading URL...')

  // 添加调试日志
  window.webContents.on('did-start-loading', () => {
    console.log('[MainWindow] Started loading page')
  })

  window.webContents.on('did-finish-load', () => {
    console.log('[MainWindow] Page finished loading')
    if (ENVIRONMENT.IS_DEV) {
      console.log('[MainWindow] Opening DevTools')
      window.webContents.openDevTools({ mode: 'detach', activate: true })
    }
    window.show()
    console.log('[MainWindow] Window shown')
  })

  window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[MainWindow] Failed to load:', errorCode, errorDescription)
  })

  // 移除 close 事件监听器，避免意外关闭
  // window.on('close', () => {
  //   console.log('[MainWindow] Window closing')
  //   for (const w of BrowserWindow.getAllWindows()) {
  //     if (w !== window) {
  //       w.destroy()
  //     }
  //   }
  // })

  console.log('[MainWindow] Setup complete, returning window')
  return window
}
