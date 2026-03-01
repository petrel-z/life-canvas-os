/**
 * AI 相关 API
 */

import { API_BASE_URL } from './config';

export interface AIConfigRequest {
  provider: string;
  api_key: string;
  model_name?: string;
}

export interface AIConfigResponse {
  provider: string;
  model_name: string;
  updated_at?: string;
}

export const aiApi = {
  /**
   * 保存 AI 配置
   */
  saveAIConfig(request: AIConfigRequest): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/user/ai-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },

  /**
   * 获取 AI 配置（不返回完整 API Key）
   */
  getAIConfig(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/user/ai-config`);
  },

  analyze(request: { type: string; data: any }): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },

  getInsights(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/ai/insights`);
  },
};
