/**
 * 数据导入导出业务逻辑层
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { dataApi, ExportFormat } from '~/renderer/api/data';

export type { ExportFormat } from '~/renderer/api/data';

export function useDataApi() {
  /**
   * 导出数据
   */
  const exportData = useCallback(async (format: ExportFormat = 'json'): Promise<void> => {
    try {
      const response = await dataApi.exportData(format);

      if (!response.ok) {
        const error = await response.json();
        toast.error('导出失败', {
          description: error.detail?.message || '请稍后重试',
        });
        throw error;
      }

      // 获取文件名从响应头
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `life_canvas_export_${new Date().toISOString().split('T')[0]}.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('数据导出成功', {
        description: `已导出为 ${format.toUpperCase()} 格式`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, []);

  /**
   * 导入数据
   */
  const importData = useCallback(async (file: File, verify: boolean = true): Promise<void> => {
    try {
      // 检查文件类型
      const validExtensions = ['.json', '.zip'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        toast.error('文件格式不支持', {
          description: '请选择 .json 或 .zip 格式的备份文件',
        });
        throw new Error('Invalid file format');
      }

      const response = await dataApi.importData(file, verify);

      if (!response.ok) {
        const error = await response.json();
        toast.error('导入失败', {
          description: error.detail?.message || '请检查文件格式是否正确',
        });
        throw error;
      }

      const result = await response.json();

      toast.success('数据导入成功', {
        description: '数据已成功恢复',
      });

      // 提示用户刷新页面
      setTimeout(() => {
        toast.info('建议刷新页面以查看最新数据', {
          action: {
            label: '刷新',
            onClick: () => window.location.reload(),
          },
        });
      }, 1000);
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }, []);

  return {
    exportData,
    importData,
  };
}
