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

  /**
   * 验证 PIN 码，返回错误消息（不使用 toast）
   * @returns { success: boolean, error?: string }
   */
  const verifyPin = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await pinApi.verify(pin);

      if (!response.ok) {
        const error = (await response.json()) as PinApiError;

        // 处理各种错误情况
        if (error.code === 401) {
          const attempts = error.data?.attempts_remaining || 0;
          return {
            success: false,
            error: `密码错误，剩余尝试次数：${attempts}`,
          };
        } else if (error.code === 429) {
          const seconds = error.data?.remaining_seconds || '30';
          return {
            success: false,
            error: `您的操作过于频繁，请 ${seconds} 秒后重试`,
          };
        } else if (error.code === 424) {
          // PIN 未设置，视为验证成功
          return { success: true };
        } else {
          return {
            success: false,
            error: error.message || '验证失败',
          };
        }
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: '网络错误，请检查后端服务',
      };
    }
  }, []);

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
    verifyPin,
    changeWithErrorHandling,
    deleteWithErrorHandling,
  }
}

/**
 * PIN API 错误处理
 */
export function handlePinApiError(error: PinApiError, toast: any) {
  if (error.code === 401) {
    const attempts = error.data?.attempts_remaining || 0;
    toast.error('密码验证失败', {
      description: `剩余尝试次数：${attempts}`,
    })
  } else if (error.code === 429) {
    const seconds = error.data?.remaining_seconds || PIN_CONFIG.DEFAULT_LOCK_SECONDS;
    toast.error('密码已锁定', {
      description: `请 ${seconds} 秒后重试`,
    })
  } else {
    toast.error('操作失败', {
      description: '请稍后重试',
    });
  }
}
