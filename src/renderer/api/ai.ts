/**
 * AI 相关 API
 */

import { API_BASE_URL } from './config';

export const aiApi = {
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
