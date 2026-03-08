/**
 * 数据导入导出业务逻辑层
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  dataApi,
  type ExportFormat,
  type ResetDataResponse,
} from '~/renderer/api/data'

export type { ExportFormat } from '~/renderer/api/data'

export function useDataApi() {
  /**
   * 导出数据（使用 fetch 调用后端 API，然后通过 IPC 保存文件）
   */
  const exportData = useCallback(
    async (format: ExportFormat = 'json'): Promise<void> => {
      try {
        // 检查是否在 Electron 环境中
        if (
          !window.App ||
          !window.App.fileOps ||
          !window.App.fileOps.saveExportData
        ) {
          toast.error('导出功能仅支持桌面应用', {
            description: '请在 Electron 应用中使用此功能',
          })
          throw new Error('Not in Electron environment')
        }

        // 显示开始提示
        toast.loading('正在导出数据...', {
          id: 'export-progress',
          description: '正在从服务器获取数据...',
        })

        // 使用 fetch 调用后端 API（这样可以在开发者工具的网络面板中看到请求）
        const response = await dataApi.exportData(format)

        if (!response.ok) {
          const error = await response.json()
          toast.error('导出失败', {
            id: 'export-progress',
            description: error.detail?.message || '请稍后重试',
          })
          throw error
        }

        // 读取响应数据为 Uint8Array（浏览器兼容）
        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // 更新提示
        toast.loading('正在导出数据...', {
          id: 'export-progress',
          description: '请选择保存位置',
        })

        // 调用 IPC 保存文件
        const result = await window.App.fileOps.saveExportData(
          uint8Array,
          format
        )

        if (!result || result.canceled) {
          // 用户取消了选择
          toast.dismiss('export-progress')
          return
        }

        if (!result.success) {
          toast.error('导出失败', {
            id: 'export-progress',
            description: '请稍后重试',
          })
          throw new Error('Export failed')
        }

        // 导出成功
        toast.success('数据导出成功', {
          id: 'export-progress',
          description: `已导出为 ${format.toUpperCase()} 格式`,
        })
      } catch (error) {
        console.error('Export failed1:', error)
        toast.error('导出失败', {
          id: 'export-progress',
          description: error instanceof Error ? error.message : '请稍后重试',
        })
        throw error
      }
    },
    []
  )

  /**
   * 导入数据（通过 Electron IPC 选择文件）
   */
  const importData = useCallback(
    async (verify: boolean = true): Promise<void> => {
      try {
        // 检查是否在 Electron 环境中
        if (!window.App || !window.App.fileOps) {
          toast.error('导入功能仅支持桌面应用', {
            description: '请在 Electron 应用中使用此功能',
          })
          throw new Error('Not in Electron environment')
        }

        // 使用 Electron IPC 选择文件并复制到临时目录
        const result = await window.App.fileOps.selectAndCopyFile()

        if (!result || result.canceled) {
          // 用户取消了选择
          return
        }

        const backupPath = result.filePath

        if (!backupPath) {
          toast.error('文件路径无效')
          throw new Error('Invalid file path')
        }

        // 显示加载提示
        toast.loading('正在导入数据...', {
          id: 'import-progress',
        })

        // 调用后端 API 导入数据
        const response = await dataApi.importData(backupPath, verify)

        if (!response.ok) {
          const error = await response.json()
          toast.error('导入失败', {
            id: 'import-progress',
            description: error.detail?.message || '请检查文件格式是否正确',
          })
          throw error
        }

        const _resultData = await response.json()

        toast.success('数据导入成功', {
          id: 'import-progress',
          description: '数据已成功恢复',
        })

        // 提示用户刷新页面
        setTimeout(() => {
          toast.info('建议刷新页面以查看最新数据', {
            action: {
              label: '刷新',
              onClick: () => window.location.reload(),
            },
          })
        }, 1000)
      } catch (error) {
        console.error('Import failed:', error)
        toast.error('导入失败', {
          id: 'import-progress',
          description: error instanceof Error ? error.message : '请稍后重试',
        })
        throw error
      }
    },
    []
  )

  /**
   * 重置/删除所有数据
   */
  const resetData = useCallback(async (): Promise<ResetDataResponse> => {
    try {
      // 显示加载提示
      toast.loading('正在重置数据...', {
        id: 'reset-progress',
        description: '正在删除所有数据并创建备份...',
      })

      // 调用后端 API 重置数据
      const response = await dataApi.resetData()

      if (!response.ok) {
        const error = await response.json()
        toast.error('重置失败', {
          id: 'reset-progress',
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data as ResetDataResponse

      // 重置成功
      toast.success('数据重置成功', {
        id: 'reset-progress',
        description: `备份已保存至: ${data.backup_path}`,
      })

      return data
    } catch (error) {
      console.error('Reset failed:', error)
      toast.error('重置失败', {
        id: 'reset-progress',
        description: error instanceof Error ? error.message : '请稍后重试',
      })
      throw error
    }
  }, [])

  return {
    exportData,
    importData,
    resetData,
  }
}
