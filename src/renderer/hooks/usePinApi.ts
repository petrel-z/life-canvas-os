/**
 * PIN 相关业务逻辑 Hook
 */

import { useCallback } from 'react'
import { pinApi } from '~/renderer/api'
import { PIN_CONFIG } from '~/renderer/lib/pin'
import type { PinApiResponse, PinApiError } from '~/renderer/lib/pin'

export function usePinApi() {
  const verifyWithErrorHandling = useCallback(
    async (pin: string, toast: any) => {
      const response = await pinApi.verify(pin)

      if (!response.ok) {
        const error = (await response.json()) as PinApiError
        handlePinApiError(error, toast)
        throw error
      }

      return response.json() as Promise<PinApiResponse>
    },
    []
  )

  const changeWithErrorHandling = useCallback(
    async (oldPin: string, newPin: string, toast: any) => {
      const response = await pinApi.change(oldPin, newPin)

      if (!response.ok) {
        const error = (await response.json()) as PinApiError
        handlePinApiError(error, toast)
        throw error
      }

      return response.json() as Promise<PinApiResponse>
    },
    []
  )

  const deleteWithErrorHandling = useCallback(
    async (pin: string, toast: any) => {
      const response = await pinApi.delete(pin)

      // DELETE 接口可能返回 204 No Content
      if (response.status === 204) {
        return {
          code: 200,
          message: '删除成功',
          timestamp: Date.now(),
        } as PinApiResponse
      }

      if (!response.ok) {
        const error = (await response.json()) as PinApiError
        toast.error('删除失败', {
          description: error.message || '请稍后重试',
        })
        throw error
      }

      return response.json() as Promise<PinApiResponse>
    },
    []
  )

  return {
    verifyWithErrorHandling,
    changeWithErrorHandling,
    deleteWithErrorHandling,
  }
}

/**
 * PIN API 错误处理
 */
export function handlePinApiError(error: PinApiError, toast: any) {
  if (error.code === 401) {
    const attempts = error.data?.attempts_remaining || 0
    toast.error(error.message || 'PIN 验证失败', {
      description: `剩余尝试次数：${attempts}`,
    })
  } else if (error.code === 429) {
    const seconds =
      error.data?.remaining_seconds || PIN_CONFIG.DEFAULT_LOCK_SECONDS
    toast.error(error.message || 'PIN 已锁定', {
      description: `请 ${seconds} 秒后重试`,
    })
  } else {
    toast.error('操作失败', {
      description: error.message || '请稍后重试',
    })
  }
}
