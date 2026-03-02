/**
 * AI 相关 API
 */

import { API_BASE_URL } from './config';

// AI 提供商类型
export type AIProvider = 'deepseek' | 'doubao' | 'openai';

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

// 洞察内容项
export interface InsightItem {
  category: string;
  insight: string;
}

// 洞察响应
export interface InsightResponse {
  id: number;
  user_id: number;
  content: InsightItem[];
  system_scores: Record<string, number>;
  provider_used: AIProvider;
  generated_at: string;
  generated_at_ts: number;
  created_at: string;
  created_at_ts: number;
}

// 洞察列表响应
export interface InsightListResponse {
  items: InsightResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 生成洞察请求
export interface GenerateInsightRequest {
  force?: boolean;
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

  /**
   * 生成洞察
   */
  generateInsight(request: GenerateInsightRequest = {}): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/insights/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },

  /**
   * 获取最新洞察
   */
  getLatestInsight(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/insights/latest`);
  },

  /**
   * 获取洞察历史列表
   */
  getInsights(params: {
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}): Promise<Response> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);

    return fetch(`${API_BASE_URL}/api/insights?${queryParams.toString()}`);
  },

  /**
   * 获取单个洞察详情
   */
  getInsightById(id: number): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/insights/${id}`);
  },
};
