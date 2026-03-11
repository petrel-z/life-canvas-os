/**
 * 饮食系统 API 业务逻辑层
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  dietApi,
  type FuelBaseline,
  type MealDeviation,
  type MealDeviationCreate,
  type MealItem,
  type ScoreHistoryItem,
} from '~/renderer/api/diet'

// 前端使用的偏离事件类型
export interface Deviation {
  id: string
  timestamp: number
  description: string
  type: 'excess' | 'deficit' | 'other'
}

// 前端使用的基准数据类型
export interface BaselineData {
  breakfast: MealItem[]
  lunch: MealItem[]
  dinner: MealItem[]
  taste: string[]
}

export function useDietApi() {
  /**
   * 获取饮食基准
   */
  const getBaseline = useCallback(async (): Promise<BaselineData | null> => {
    const response = await dietApi.getBaseline()

    if (!response.ok) {
      const error = await response.json()
      // 404 表示基准还未设置，不算错误
      if (response.status === 404) {
        return null
      }
      toast.error('获取饮食基准失败', {
        description: error.detail?.message || '请稍后重试',
      })
      throw error
    }

    const result = await response.json()
    const data = result.data as FuelBaseline

    // 转换后端格式到前端格式（null 转为空数组）
    return {
      breakfast: data.breakfast || [],
      lunch: data.lunch || [],
      dinner: data.dinner || [],
      taste: data.taste || [],
    }
  }, [])

  /**
   * 更新饮食基准
   */
  const updateBaseline = useCallback(
    async (data: BaselineData): Promise<BaselineData> => {
      // 验证：确保每个食物项都有种类和分量
      const validateMealItems = (items: MealItem[]): boolean => {
        return items.every(item => item.name?.trim() && item.amount?.trim())
      }

      if (
        !validateMealItems(data.breakfast) ||
        !validateMealItems(data.lunch) ||
        !validateMealItems(data.dinner)
      ) {
        toast.error('请填写完整的食物种类和分量')
        throw new Error('Incomplete meal data')
      }

      // 转换前端格式到后端格式
      // 空数组需要转换为 null
      const apiData = {
        breakfast: data.breakfast.length > 0 ? data.breakfast : null,
        lunch: data.lunch.length > 0 ? data.lunch : null,
        dinner: data.dinner.length > 0 ? data.dinner : null,
        taste: data.taste,
      }

      const response = await dietApi.updateBaseline(apiData)

      if (!response.ok) {
        const error = await response.json()
        toast.error('更新饮食基准失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const resultData = result.data as FuelBaseline

      toast.success('饮食基准更新成功')

      // 转换后端响应到前端格式
      return {
        breakfast: resultData.breakfast || [],
        lunch: resultData.lunch || [],
        dinner: resultData.dinner || [],
        taste: resultData.taste || [],
      }
    },
    []
  )

  /**
   * 创建偏离事件
   */
  const createDeviation = useCallback(
    async (description: string): Promise<Deviation> => {
      const apiData: MealDeviationCreate = {
        description,
      }

      const response = await dietApi.createDeviation(apiData)

      if (!response.ok) {
        const error = await response.json()
        toast.error('创建偏离事件失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data as MealDeviation

      toast.success('偏离事件已记录')

      // 转换后端响应到前端格式
      return {
        id: data.id.toString(),
        timestamp: data.occurred_at_ts,
        description: data.description,
        type: 'other',
      }
    },
    []
  )

  /**
   * 获取偏离事件列表（返回全部数据，用于旧版本）
   */
  const getDeviations = useCallback(
    async (params?: {
      start_date?: string
      end_date?: string
    }): Promise<{ deviations: Deviation[]; total?: number }> => {
      // 总是传递 page 和 page_size
      const requestParams = {
        page: 1,
        page_size: 100,
        ...params,
      }

      const response = await dietApi.getDeviations(requestParams)

      if (!response.ok) {
        const error = await response.json()
        toast.error('获取偏离事件列表失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data as { items: MealDeviation[]; total: number }

      // 转换后端响应到前端格式
      const deviations: Deviation[] = data.items.map(item => ({
        id: item.id.toString(),
        timestamp: item.occurred_at_ts,
        description: item.description,
        type: 'other',
      }))

      // 按时间倒序排列（最新的在前）
      deviations.sort((a, b) => b.timestamp - a.timestamp)

      return {
        deviations,
        total: data.total,
      }
    },
    []
  )

  /**
   * 获取偏离事件列表（分页模式，用于 usePagination hook）
   */
  const getDeviationsPaginated = useCallback(
    async (params?: {
      page?: number
      page_size?: number
      start_date?: string
      end_date?: string
    }): Promise<{ items: Deviation[]; hasMore: boolean }> => {
      const requestParams = {
        page: params?.page || 1,
        page_size: params?.page_size || 10,
        start_date: params?.start_date,
        end_date: params?.end_date,
      }

      const response = await dietApi.getDeviations(requestParams)

      if (!response.ok) {
        const error = await response.json()
        toast.error('获取偏离事件列表失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data as { items: MealDeviation[]; total: number }

      // 转换后端响应到前端格式
      const deviations: Deviation[] = data.items.map(item => ({
        id: item.id.toString(),
        timestamp: item.occurred_at_ts,
        description: item.description,
        type: 'other',
      }))

      // 按时间倒序排列（最新的在前）
      deviations.sort((a, b) => b.timestamp - a.timestamp)

      // 计算是否有更多数据
      const hasMore = data.items.length === requestParams.page_size

      return {
        items: deviations,
        hasMore,
      }
    },
    []
  )

  /**
   * 更新偏离事件
   */
  const updateDeviation = useCallback(
    async (id: string, description: string): Promise<Deviation> => {
      const response = await dietApi.updateDeviation(parseInt(id, 10), {
        description,
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('更新偏离事件失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data as MealDeviation

      toast.success('更新成功')

      // 转换后端响应到前端格式
      return {
        id: data.id.toString(),
        timestamp: data.occurred_at_ts,
        description: data.description,
        type: 'other',
      }
    },
    []
  )

  /**
   * 删除偏离事件
   */
  const deleteDeviation = useCallback(async (id: string): Promise<void> => {
    const response = await dietApi.deleteDeviation(parseInt(id, 10))

    if (!response.ok) {
      const error = await response.json()
      toast.error('删除偏离事件失败', {
        description: error.detail?.message || '请稍后重试',
      })
      throw error
    }

    toast.success('删除成功')
  }, [])

  /**
   * 获取评分历史
   */
  const getScoreHistory = useCallback(
    async (
      days: number = 30
    ): Promise<{
      history: (ScoreHistoryItem & { timestamp: number })[]
      currentScore: number
    }> => {
      const response = await dietApi.getScoreHistory(days)

      if (!response.ok) {
        const error = await response.json()
        toast.error('获取评分历史失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      const data = result.data as {
        history: ScoreHistoryItem[]
        current_score: number
      }

      // 添加 timestamp 字段（从 created_at 字符串解析）
      const historyWithTimestamp = data.history.map(item => ({
        ...item,
        timestamp: new Date(item.created_at).getTime(),
      }))

      return {
        history: historyWithTimestamp,
        currentScore: data.current_score,
      }
    },
    []
  )

  return {
    getBaseline,
    updateBaseline,
    createDeviation,
    getDeviations,
    getDeviationsPaginated,
    updateDeviation,
    deleteDeviation,
    getScoreHistory,
  }
}
