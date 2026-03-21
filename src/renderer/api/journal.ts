/**
 * 日记相关 API
 */

import { apiRequest } from './client'

// 类型定义
export type MoodType = 'great' | 'good' | 'neutral' | 'bad' | 'terrible'

export interface JournalCreateRequest {
  title: string
  content: string
  mood?: MoodType
  tags?: string
  related_system?: string
  is_private?: boolean
}

export interface JournalUpdateRequest {
  title?: string
  content?: string
  mood?: MoodType
  tags?: string
  related_system?: string
  is_private?: boolean
}

export interface JournalResponse {
  id: number
  user_id: number
  title: string
  content: string
  mood: MoodType | null
  tags: string[] | string | null // 后端可能返回数组或字符串
  related_system: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface PaginatedJournalsResponse {
  items: JournalResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface JournalListParams {
  page?: number
  page_size?: number
  mood?: MoodType
  related_system?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export const journalApi = {
  list(params?: JournalListParams): Promise<Response> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.page_size)
      queryParams.append('page_size', params.page_size.toString())
    if (params?.mood) queryParams.append('mood', params.mood)
    if (params?.related_system)
      queryParams.append('related_system', params.related_system)
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by)
    if (params?.sort_order) queryParams.append('sort_order', params.sort_order)

    const url = `/api/journal${queryParams.toString() ? `?${queryParams}` : ''}`
    return apiRequest(url)
  },

  get(id: number): Promise<Response> {
    return apiRequest(`/api/journal/${id}`)
  },

  create(data: JournalCreateRequest): Promise<Response> {
    return apiRequest('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  update(id: number, data: JournalUpdateRequest): Promise<Response> {
    return apiRequest(`/api/journal/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  delete(id: number): Promise<Response> {
    return apiRequest(`/api/journal/${id}`, {
      method: 'DELETE',
    })
  },
}
