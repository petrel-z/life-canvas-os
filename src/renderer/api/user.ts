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

export interface UserSettings {
  id?: number
  user_id?: number
  theme?: 'light' | 'dark' | 'auto'
  language?: string
  auto_save_enabled?: boolean
  auto_save_interval?: number
  notification_enabled?: boolean
  notification_time?: string
  show_year_progress?: boolean
  show_weekday?: boolean
  pin_verify_on_startup?: boolean
  pin_verify_for_private_journal?: boolean
  pin_verify_for_data_export?: boolean
  pin_verify_for_settings_change?: boolean
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

  getSettings(): Promise<Response> {
    return apiRequest('/api/user/settings')
  },

  updateSettings(data: Partial<UserSettings>): Promise<Response> {
    return apiRequest('/api/user/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
}
