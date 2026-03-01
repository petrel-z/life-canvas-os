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

export function useAiApi() {
  /**
   * 获取 AI 配置
   */
  const getAIConfig = useCallback(async (): Promise<AIConfigResponse | null> => {
    const response = await aiApi.getAIConfig();

    if (response.status === 424) {
      // AI 未配置，返回 null
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      toast.error('获取 AI 配置失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    return result.data as AIConfigResponse;
  }, []);

  /**
   * 保存 AI 配置
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

    const response = await aiApi.saveAIConfig(requestData);

    if (!response.ok) {
      const error = await response.json();
      toast.error('保存 AI 配置失败', {
        description: error.detail?.message || '请检查 API Key 是否正确',
      });
      throw error;
    }

    const result = await response.json();
    const data = result.data as AIConfigResponse;

    toast.success('AI 配置保存成功');

    return data;
  }, []);

  return {
    getAIConfig,
    saveAIConfig,
  };
}
