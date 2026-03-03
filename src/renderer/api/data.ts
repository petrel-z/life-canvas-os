/**
 * 数据导入导出 API
 */

import { apiRequest } from './client'

export type ExportFormat = 'json' | 'zip';

export interface ResetDataResponse {
  backup_path: string;
  reset_at: string;
}
export type ExportFormat = 'json' | 'zip'

export const dataApi = {
  /**
   * 导出数据
   */
  exportData(format: ExportFormat = 'json'): Promise<Response> {
    return apiRequest(`/api/data/export?format=${format}`, {
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

    return apiRequest(`/api/data/import?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  },

  /**
   * 获取备份列表
   */
  getBackups(): Promise<Response> {
    return apiRequest('/api/data/backups')
  },

  /**
   * 创建备份
   */
  createBackup(): Promise<Response> {
    return apiRequest('/api/data/backup/create', {
      method: 'POST',
    })
  },


    /**
   * 重置/删除所有数据
   */
  resetData(): Promise<Response> {
    return apiRequest('/api/data/reset', {
      method: 'POST',
    })
  },
  /**
   * 健康检查
   */
  healthCheck(): Promise<Response> {
    return apiRequest('/api/data/health')
  },
}
