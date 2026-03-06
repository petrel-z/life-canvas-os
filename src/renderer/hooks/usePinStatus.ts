/**
 * PIN 验证要求管理 Hook
 * 使用本地缓存减少接口调用
 */

import { useState, useCallback, useRef } from 'react'
import { pinApi } from '~/renderer/api'
import type { PinVerifyRequirements } from '~/renderer/api/pin'
import {
  CACHE_KEYS,
  getCache,
  setCache,
  removeCache,
} from '~/renderer/lib/cacheUtils'

/**
 * PIN 验证要求管理 Hook
 * @returns PIN 验证要求和操作方法
 */
export function usePinStatus() {
  const [pinStatus, setPinStatus] = useState<PinVerifyRequirements | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false)

  /**
   * 获取 PIN 验证要求（优先从缓存读取）
   * @param forceRefresh - 是否强制刷新，忽略缓存
   */
  const fetchPinStatus = useCallback(async (forceRefresh: boolean = false) => {
    // 防止重复调用
    if (isLoadingRef.current && !forceRefresh) {
      return
    }

    // 如果不是强制刷新，先尝试从缓存读取
    if (!forceRefresh) {
      const cachedStatus = getCache<PinVerifyRequirements>(
        CACHE_KEYS.PIN_STATUS
      )
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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '获取 PIN 验证要求失败')
      }

      const result = await response.json()
      const statusData = result.data as PinVerifyRequirements

      // 更新状态
      setPinStatus(statusData)

      // 保存到缓存（5 分钟过期）
      setCache(CACHE_KEYS.PIN_STATUS, statusData, 5)

      return statusData
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '获取 PIN 验证要求失败'
      setError(errorMessage)
      console.error('Failed to fetch PIN verify requirements:', err)
      throw err
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [])

  /**
   * 刷新 PIN 验证要求（强制从服务器重新获取，不清除当前状态）
   */
  const refreshPinStatus = useCallback(async () => {
    try {
      // 强制从服务器刷新
      const status = await fetchPinStatus(true)
      return status
    } catch (err) {
      console.error('Failed to refresh PIN status:', err)
      throw err
    }
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
   * 手动设置 PIN 验证要求（用于离线操作）
   * @param status - 新的 PIN 验证要求
   */
  const setPinStatusManually = useCallback((status: PinVerifyRequirements) => {
    setPinStatus(status)
    // 同步更新缓存
    setCache(CACHE_KEYS.PIN_STATUS, status, 5)
    setError(null)
  }, [])

  /**
   * 清除 PIN 验证要求缓存
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
