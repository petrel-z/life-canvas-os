/**
 * 时间轴 API 业务逻辑层
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { timelineApi, TimelineDateGroup, TimelineListParams, TimelineEventItem } from '~/renderer/api/timeline';

// 导出类型供页面使用
export type { TimelineDateGroup, TimelineEventItem };

export function useTimelineApi() {
  /**
   * 获取时间轴
   */
  const getTimeline = useCallback(async (params?: TimelineListParams): Promise<{
    timeline: TimelineDateGroup[];
    totalEvents: number;
    hasMore: boolean;
  }> => {
    const response = await timelineApi.getTimeline(params);

    if (!response.ok) {
      const error = await response.json();
      toast.error('获取时间轴失败', {
        description: error.detail?.message || '请稍后重试',
      });
      throw error;
    }

    const result = await response.json();
    const data = result.data;

    return {
      timeline: data.timeline || [],
      totalEvents: data.total_events || 0,
      hasMore: data.has_more || false,
    };
  }, []);

  return {
    getTimeline,
  };
}
