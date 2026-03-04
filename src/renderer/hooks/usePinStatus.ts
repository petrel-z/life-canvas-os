/**
 * PIN 状态管理 Hook
 * 使用本地缓存减少接口调用，处理访问限制
 */

import { useState, useCallback, useRef } from 'react'
import { pinApi } from '~/renderer/api'
import {
  CACHE_KEYS,
  getCache,
  setCache,
  removeCache,
} from '~/renderer/lib/cacheUtils'

export interface PinStatus {
  has_pin_set: boolean
}

/**
 * PIN 状态管理 Hook
 * @returns PIN 状态和操作方法
 */
export function usePinStatus() {
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false)

  /**
   * 获取 PIN 状态（优先从缓存读取）
   * @param forceRefresh - 是否强制刷新，忽略缓存
   */
  const fetchPinStatus = useCallback(async (forceRefresh: boolean = false) => {
    // 防止重复调用
    if (isLoadingRef.current && !forceRefresh) {
      return
    }

    // 如果不是强制刷新，先尝试从缓存读取
    if (!forceRefresh) {
      const cachedStatus = getCache<PinStatus>(CACHE_KEYS.PIN_STATUS)
      if (cachedStatus) {
        setPinStatus(cachedStatus)
        setError(null)
        return cachedStatus
      }
    }

    // 从服务器获取
    if (isLoadingRef.current) {
      return
    }

    try {
      isLoadingRef.current = true
      setIsLoading(true)
      setError(null)

      const response = await pinApi.verifyRequirements()

      console.log(
        '[usePinStatus] Response status:',
        response.status,
        response.ok
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[usePinStatus] Error response:', errorData)
        throw new Error(errorData.detail?.message || '获取 PIN 状态失败')
      }

      const result = await response.json()
      console.log('[usePinStatus] Success response:', result)
      const statusData = result.data as { has_pin: boolean }

      // 转换为 PinStatus 格式
      const status: PinStatus = { has_pin_set: statusData.has_pin }

      // 更新状态
      setPinStatus(status)

      // 保存到缓存（5分钟过期）
      setCache(CACHE_KEYS.PIN_STATUS, status, 5)

      return status
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '获取 PIN 状态失败'
      setError(errorMessage)
      console.error('Failed to fetch PIN status:', err)
      throw err
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [])

  /**
   * 刷新 PIN 状态（清除缓存并重新获取）
   */
  const refreshPinStatus = useCallback(async () => {
    // 清除缓存
    removeCache(CACHE_KEYS.PIN_STATUS)
    // 强制刷新
    return fetchPinStatus(true)
  }, [fetchPinStatus])

  /**
   * 在 PIN 操作后更新状态
   * 用于：创建 PIN、修改 PIN、删除 PIN 等操作后
   */
  const updatePinStatusAfterOperation = useCallback(async () => {
    try {
      // 清除缓存
      removeCache(CACHE_KEYS.PIN_STATUS)
      // 重新获取最新状态
      await refreshPinStatus()
    } catch (err) {
      console.error('Failed to update PIN status after operation:', err)
    }
  }, [refreshPinStatus])

  /**
   * 手动设置 PIN 状态（用于离线操作）
   * @param status - 新的 PIN 状态
   */
  const setPinStatusManually = useCallback((status: PinStatus) => {
    setPinStatus(status)
    // 同步更新缓存
    setCache(CACHE_KEYS.PIN_STATUS, status, 5)
    setError(null)
  }, [])

  /**
   * 清除 PIN 状态缓存
   */
  const clearPinStatusCache = useCallback(() => {
    removeCache(CACHE_KEYS.PIN_STATUS)
    setPinStatus(null)
  }, [])

  return {
    pinStatus,
    isLoading,
    error,
    fetchPinStatus,
    refreshPinStatus,
    updatePinStatusAfterOperation,
    setPinStatusManually,
    clearPinStatusCache,
  }
}
