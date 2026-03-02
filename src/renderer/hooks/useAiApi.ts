/**
 * AI API 业务逻辑层
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { aiApi, AIConfigRequest, AIConfigResponse } from '~/renderer/api/ai';

export interface AIConfigData {
  provider: string;
  apiKey: string;
  modelName?: string;
}

// 统一响应格式
interface APIResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export function useAiApi() {
  /**
   * 获取 AI 配置
   */
  const getAIConfig = useCallback(async (): Promise<AIConfigResponse | null> => {
    try {
      const response = await aiApi.getAIConfig();

      if (response.status === 424) {
        // AI 未配置，返回 null
        return null;
      }

      if (!response.ok) {
        const error = await response.json();
        toast.error('获取 AI 配置失败', {
          description: error.message || '请稍后重试',
        });
        throw error;
      }

      const result = await response.json();
      return result.data as AIConfigResponse;
    } catch (error) {
      console.error('Failed to get AI config:', error);
      throw error;
    }
  }, []);

  /**
   * 保存 AI 配置（会验证 API Key）
   */
  const saveAIConfig = useCallback(async (config: AIConfigData): Promise<AIConfigResponse> => {
    // 参数校验
    if (!config.provider || config.provider.trim() === '') {
      toast.error('请选择模型供应商');
      throw new Error('Provider is required');
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      toast.error('请输入 API 密钥');
      throw new Error('API Key is required');
    }

    const requestData: AIConfigRequest = {
      provider: config.provider.toLowerCase(),
      api_key: config.apiKey,
      model_name: config.modelName || 'deepseek-chat',
    };

    try {
      toast.loading('正在验证并保存 AI 配置...', {
        id: 'save-ai-config',
        description: '这可能需要几秒钟',
      });

      const response = await aiApi.saveAIConfig(requestData);
      const result: APIResponse = await response.json();

      // 根据响应的 code 字段处理不同的状态
      switch (result.code) {
        case 200:
          // 成功
          toast.success('AI 配置保存成功', {
            id: 'save-ai-config',
            description: `已连接到 ${result.data.provider.toUpperCase()}`,
          });
          return result.data as AIConfigResponse;

        case 400:
          // 不支持的提供商
          toast.error('不支持的 AI 提供商', {
            id: 'save-ai-config',
            description: result.message || '请检查提供商设置',
          });
          throw new Error(result.message);

        case 401:
          // API Key 无效或已过期
          toast.error('API Key 无效或已过期', {
            id: 'save-ai-config',
            description: '请检查 API Key 是否正确',
          });
          throw new Error(result.message);

        case 429:
          // 频率超限
          toast.error('API 请求频率超限', {
            id: 'save-ai-config',
            description: '请稍后再试',
          });
          throw new Error(result.message);

        case 504:
          // 请求超时
          toast.error('API 请求超时', {
            id: 'save-ai-config',
            description: '请检查网络连接',
          });
          throw new Error(result.message);

        default:
          // 其他错误
          toast.error('AI 配置保存失败', {
            id: 'save-ai-config',
            description: result.message || '请稍后重试',
          });
          throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to save AI config:', error);

      // 如果是已处理的错误（通过 toast），直接抛出
      if (error instanceof Error) {
        throw error;
      }

      // 未处理的错误
      toast.error('AI 配置保存失败', {
        id: 'save-ai-config',
        description: '请稍后重试',
      });
      throw error;
    }
  }, []);

  return {
    getAIConfig,
    saveAIConfig,
  };
}
