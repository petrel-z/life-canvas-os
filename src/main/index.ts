import { app } from 'electron'

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { loadReactDevtools } from 'lib/electron-app/utils'
import { ENVIRONMENT } from 'shared/constants'
import { MainWindow } from './windows/main'
import { waitFor } from 'shared/utils'
import { pythonManager } from './python/manager'

makeAppWithSingleInstanceLock(async () => {
  // 启动 Python 后端进程
  console.log('[Main] Starting Python backend...')
  pythonManager.start()

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
