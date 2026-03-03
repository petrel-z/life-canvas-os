/**
 * 饮食系统 API 客户端
 */
import { apiRequest } from './client'

export interface MealItem {
  name: string
  amount?: string
  calories?: number
}

export interface FuelBaseline {
  breakfast: MealItem[] | null
  lunch: MealItem[] | null
  dinner: MealItem[] | null
  taste: string[]
}

export interface MealDeviation {
  id: number
  system_id: number
  description: string
  occurred_at: string
  created_at: string
  occurred_at_ts: number
  created_at_ts: number
}

export interface MealDeviationCreate {
  description: string
  occurred_at?: string
}

export interface MealDeviationUpdate {
  description?: string
}

export interface DeviationsListParams {
  start_date?: string
  end_date?: string
  page: number
  page_size: number
}

export const dietApi = {
  /**
   * 获取饮食基准
   */
  getBaseline(): Promise<Response> {
    return apiRequest('/api/diet/baseline')
  },

  /**
   * 更新饮食基准
   */
  updateBaseline(data: {
    breakfast: MealItem[] | null
    lunch: MealItem[] | null
    dinner: MealItem[] | null
    taste: string[]
  }): Promise<Response> {
    return apiRequest('/api/diet/baseline', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  /**
   * 创建偏离事件
   */
  createDeviation(data: MealDeviationCreate): Promise<Response> {
    return apiRequest('/api/diet/deviations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  /**
   * 获取偏离事件列表
   */
  getDeviations(params: DeviationsListParams): Promise<Response> {
    const queryParams = new URLSearchParams()
    queryParams.append('page', params.page.toString())
    queryParams.append('page_size', params.page_size.toString())
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)

    const url = `/api/diet/deviations?${queryParams}`
    return apiRequest(url)
  },

  /**
   * 更新偏离事件
   */
  updateDeviation(
    deviationId: number,
    data: MealDeviationUpdate
  ): Promise<Response> {
    return apiRequest(`/api/diet/deviations/${deviationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  /**
   * 删除偏离事件
   */
  deleteDeviation(deviationId: number): Promise<Response> {
    return apiRequest(`/api/diet/deviations/${deviationId}`, {
      method: 'DELETE',
    })
  },
}
