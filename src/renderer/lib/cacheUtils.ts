/**
 * 缓存工具函数
 * 基于 localStorage 实现简单的缓存机制
 */

/**
 * 缓存键常量
 */
export const CACHE_KEYS = {
  PIN_STATUS: 'pin_status',
  USER_PROFILE: 'user_profile',
  DIMENSION_SCORES: 'dimension_scores',
  FUEL_BASELINE: 'fuel_baseline',
  AI_INSIGHTS: 'ai_insights',
} as const

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt: number
}

/**
 * 默认缓存过期时间（分钟）
 */
const DEFAULT_CACHE_EXPIRY_MINUTES = 5

/**
 * 设置缓存
 * @param key - 缓存键
 * @param data - 缓存数据
 * @param expiryMinutes - 过期时间（分钟），默认 5 分钟
 */
export function setCache<T>(
  key: string,
  data: T,
  expiryMinutes: number = DEFAULT_CACHE_EXPIRY_MINUTES
): void {
  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMinutes * 60 * 1000,
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    console.error(`Failed to set cache for key: ${key}`, error)
  }
}

/**
 * 获取缓存
 * @param key - 缓存键
 * @returns 缓存数据，如果不存在或已过期则返回 null
 */
export function getCache<T>(key: string): T | null {
  try {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) {
      return null
    }

    const item: CacheItem<T> = JSON.parse(itemStr)

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      localStorage.removeItem(key)
      return null
    }

    return item.data
  } catch (error) {
    console.error(`Failed to get cache for key: ${key}`, error)
    return null
  }
}

/**
 * 删除缓存
 * @param key - 缓存键
 */
export function removeCache(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove cache for key: ${key}`, error)
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('Failed to clear all cache', error)
  }
}

/**
 * 检查缓存是否存在
 * @param key - 缓存键
 * @returns 缓存是否存在且未过期
 */
export function hasCache(key: string): boolean {
  try {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) {
      return false
    }

    const item: CacheItem<any> = JSON.parse(itemStr)

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      localStorage.removeItem(key)
      return false
    }

    return true
  } catch (error) {
    console.error(`Failed to check cache for key: ${key}`, error)
    return false
  }
}
