import { contextBridge, ipcRenderer } from 'electron'

declare global {
  interface Window {
    App: typeof API
  }
}

const API = {
  sayHelloFromBridge: () => console.log('\nHello from bridgeAPI! 👋\n\n'),
  username: process.env.USER,
  // 文件操作 API
  fileOps: {
    // 选择文件并复制到后端可访问目录
    selectAndCopyFile: () => ipcRenderer.invoke('file:select-and-copy'),
    // 保存导出数据到指定路径
    saveExportData: (fileData: Uint8Array, format: 'json' | 'zip') =>
      ipcRenderer.invoke('file:save-export-data', fileData, format),
  },
  // 通用 API 请求（通过 IPC 转发到 Python 后端）
  request: (action: string, params: any = {}) =>
    ipcRenderer.invoke('api:request', action, params),
}

contextBridge.exposeInMainWorld('App', API)
