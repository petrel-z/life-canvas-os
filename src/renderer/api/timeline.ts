/**
 * 时间轴 API 客户端
 */

import { apiRequest } from './client'

export type TimelineEventType = 'diary' | 'diet'

export interface TimelineEventItem {
  id: string
  type: TimelineEventType
  title: string
  content: string
  time: string
  timestamp: number
}

export interface TimelineDateGroup {
  date: string
  events: TimelineEventItem[]
}

export interface TimelineResponse {
  timeline: TimelineDateGroup[]
  total_events: number
  has_more: boolean
}

export interface TimelineListParams {
  type?: 'all' | 'diary' | 'diet'
  page?: number
  page_size?: number
}

export const timelineApi = {
  /**
   * 获取时间轴
   */
  getTimeline(params?: TimelineListParams): Promise<Response> {
    const queryParams = new URLSearchParams()
    queryParams.append('page', (params?.page || 1).toString())
    queryParams.append('page_size', (params?.page_size || 30).toString())
    if (params?.type && params.type !== 'all') {
      queryParams.append('type', params.type)
    }

    const url = `/api/timeline?${queryParams}`
    return apiRequest(url)
  },
}
