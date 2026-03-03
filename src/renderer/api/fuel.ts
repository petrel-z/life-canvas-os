/**
 * 燃料系统相关 API
 */

import { API_BASE_URL } from './config'

export const fuelApi = {
  getBaseline(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/fuel/baseline`)
  },

  setBaseline(dimensions: Record<string, number>): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/fuel/baseline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dimensions }),
    })
  },

  getDeviations(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/fuel/deviations`)
  },
}
