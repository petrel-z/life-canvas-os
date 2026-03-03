/**
 * 数据导入导出 API
 */

import { API_BASE_URL } from './config'

export type ExportFormat = 'json' | 'zip'

export const dataApi = {
  /**
   * 导出数据
   */
  exportData(format: ExportFormat = 'json'): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/export?format=${format}`, {
      method: 'POST',
    })
  },

  /**
   * 导入数据（通过文件路径）
   * 使用 Electron IPC 选择文件并获取路径
   */
  importData(backupPath: string, verify: boolean = true): Promise<Response> {
    const params = new URLSearchParams()
    params.append('backup_path', backupPath)
    params.append('verify', verify.toString())

    return fetch(`${API_BASE_URL}/api/data/import?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  },

  /**
   * 获取备份列表
   */
  getBackups(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/backups`)
  },

  /**
   * 创建备份
   */
  createBackup(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/backup/create`, {
      method: 'POST',
    })
  },

  /**
   * 健康检查
   */
  healthCheck(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/health`)
  },
}
