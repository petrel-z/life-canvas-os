/**
 * 时间轴 API 业务逻辑层
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  timelineApi,
  type TimelineDateGroup,
  type TimelineEventItem,
  type TimelineListParams,
} from '~/renderer/api/timeline'

// 导出类型供页面使用
export type { TimelineDateGroup, TimelineEventItem }

export interface TimelineAPIResponse {
  items: TimelineEventItem[]
  hasMore: boolean
}

export interface FlatTimelineEvent extends TimelineEventItem {
  date: string // 格式化的日期字符串
}

export function useTimelineApi() {
  /**
   * 获取时间轴（返回按日期分组的数据）
   */
  const getTimeline = useCallback(
    async (
      params?: TimelineListParams
    ): Promise<{
      timeline: TimelineDateGroup[]
      totalEvents: number
      hasMore: boolean
    }> => {
      const response = await timelineApi.getTimeline(params)

      if (!response.ok) {
        const error = await response.json()
        toast.error('获取时间轴失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data

      return {
        timeline: data.timeline || [],
        totalEvents: data.total_events || 0,
        hasMore: data.has_more || false,
      }
    },
    []
  )

  /**
   * 获取时间轴（返回扁平的事件列表，用于分页加载）
   */
  const getTimelineFlat = useCallback(
    async (
      params?: TimelineListParams
    ): Promise<{
      items: FlatTimelineEvent[]
      hasMore: boolean
    }> => {
      const response = await timelineApi.getTimeline(params)

      if (!response.ok) {
        const error = await response.json()
        toast.error('获取时间轴失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data

      // 将按日期分组的数据转换为扁平列表
      const flatItems: FlatTimelineEvent[] = []
      const timeline = data.timeline || []

      timeline.forEach((group: TimelineDateGroup) => {
        group.events.forEach(event => {
          flatItems.push({
            ...event,
            date: group.date,
          })
        })
      })

      return {
        items: flatItems,
        hasMore: data.has_more || false,
      }
    },
    []
  )

  return {
    getTimeline,
    getTimelineFlat,
  }
}
