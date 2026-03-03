/**
 * 数据导入导出 API
 */

import { API_BASE_URL } from './config';

export type ExportFormat = 'json' | 'zip';

export interface ResetDataResponse {
  backup_path: string;
  reset_at: string;
}

export const dataApi = {
  /**
   * 导出数据
   */
  exportData(format: ExportFormat = 'json'): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/export?format=${format}`, {
      method: 'POST',
    });
  },

  /**
   * 导入数据（通过文件路径）
   * 使用 Electron IPC 选择文件并获取路径
   */
  importData(backupPath: string, verify: boolean = true): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backup_path: backupPath,
        verify: verify,
      }),
    });
  },

  /**
   * 获取备份列表
   */
  getBackups(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/backups`);
  },

  /**
   * 创建备份
   */
  createBackup(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/backup/create`, {
      method: 'POST',
    });
  },

  /**
   * 重置/删除所有数据
   */
  resetData(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  },

  /**
   * 健康检查
   */
  healthCheck(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/data/health`);
  },
};
