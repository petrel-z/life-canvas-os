/**
 * 燃料系统相关 API
 */

import { apiRequest } from './client'

export const fuelApi = {
  getBaseline(): Promise<Response> {
    return apiRequest('/api/fuel/baseline')
  },

  setBaseline(dimensions: Record<string, number>): Promise<Response> {
    return apiRequest('/api/fuel/baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dimensions }),
    })
  },

  getDeviations(): Promise<Response> {
    return apiRequest('/api/fuel/deviations')
  },
}
