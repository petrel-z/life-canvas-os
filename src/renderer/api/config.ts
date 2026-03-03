/**
 * API 配置
 */
import { apiRequest } from './client'

// 导出基础 URL（仅供兼容）
export const HTTP_BASE_URL = 'http://127.0.0.1:8000'

/**
 * 通用 API 请求方法
 */
export async function request(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  return apiRequest(endpoint, options)
}

/**
 * API 端点定义
 */
export const API_ENDPOINTS = {
  // PIN 相关
  PIN: {
    VERIFY: '/api/pin/verify',
    CHANGE: '/api/pin/change',
    DELETE: '/api/pin',
    STATUS: '/api/pin/status',
    SETUP: '/api/pin/setup',
  },

  // 日记相关
  JOURNAL: {
    LIST: '/api/journals',
    CREATE: '/api/journals',
    DETAIL: (id: string) => `/api/journals/${id}`,
    UPDATE: (id: string) => `/api/journals/${id}`,
    DELETE: (id: string) => `/api/journals/${id}`,
  },

  // 用户相关
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE: '/api/user/profile',
  },

  // 维度评分
  DIMENSIONS: {
    LIST: '/api/dimensions',
    UPDATE: '/api/dimensions',
  },

  // 燃料系统
  FUEL: {
    BASELINE: '/api/fuel/baseline',
    DEVIATIONS: '/api/fuel/deviations',
  },

  // AI 相关
  AI: {
    ANALYZE: '/api/ai/analyze',
    INSIGHTS: '/api/ai/insights',
  },

  // 时间轴
  TIMELINE: {
    EVENTS: '/api/timeline/events',
  },
} as const
