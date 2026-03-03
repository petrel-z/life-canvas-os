/**
 * 用户相关 API
 */

import { apiRequest } from './client'

export interface UserProfile {
  id?: string
  display_name?: string
  birthday?: string
  mbti?: string
  values?: string // JSON 数组字符串
  life_expectancy?: number
}

export const userApi = {
  getProfile(): Promise<Response> {
    return apiRequest('/api/user/profile')
  },

  updateProfile(data: Partial<UserProfile>): Promise<Response> {
    return apiRequest('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
}
