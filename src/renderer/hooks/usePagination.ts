/**
 * 通用分页加载 Hook
 * 支持增量加载（加载更多）和页码切换两种模式
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// biome-ignore lint/complexity/noBannedTypes: 泛型默认值使用 {} 是标准做法
export interface PaginationOptions<T, P extends Record<string, any> = {}> {
  /** 每页数量 */
  pageSize?: number
  /** 是否启用增量加载（加载更多模式）*/
  incremental?: boolean
  /** 获取数据的函数 */
  fetchData: (params: P & { page: number; page_size: number }) => Promise<{
    items: T[]
    total?: number
    hasMore: boolean
  }>
  /** 额外的请求参数 */
  extraParams?: P
  /** 数据加载成功后的回调 */
  onSuccess?: (items: T[]) => void
  /** 数据加载失败后的回调 */
  onError?: (error: Error) => void
}

export interface PaginationResult<T> {
  /** 当前页码 */
  currentPage: number
  /** 所有已加载的数据 */
  data: T[]
  /** 是否有更多数据 */
  hasMore: boolean
  /** 是否正在加载更多 */
  isLoadingMore: boolean
  /** 是否正在加载首页 */
  isLoading: boolean
  /** 是否有数据 */
  hasData: boolean
  /** 加载下一页 */
  loadMore: () => Promise<void>
  /** 加载指定页 */
  loadPage: (page: number) => Promise<void>
  /** 刷新数据（重新加载第一页）*/
  refresh: () => Promise<void>
  /** 重置分页状态 */
  reset: () => void
}

// biome-ignore lint/complexity/noBannedTypes: 泛型默认值使用 {} 是标准做法
export function usePagination<T, P extends Record<string, any> = {}>(
  options: PaginationOptions<T, P>
): PaginationResult<T> {
  const {
    pageSize = 10,
    incremental = false,
    fetchData,
    extraParams = {} as P,
    onSuccess,
    onError,
  } = options

  const [currentPage, setCurrentPage] = useState(1)
  const [allData, setAllData] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasData, setHasData] = useState(false)

  // 使用 ref 存储之前的 extraParams 用于比较
  const prevExtraParamsRef = useRef<P | null>(null)
  const isLoadingRef = useRef(false)

  /**
   * 加载数据
   */
  const loadData = useCallback(
    async (page: number, isRefresh = false) => {
      if (isLoadingRef.current) return

      isLoadingRef.current = true
      if (isRefresh) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const result = await fetchData({
          ...(extraParams as any),
          page,
          page_size: pageSize,
        })

        if (isRefresh) {
          setAllData(result.items)
          setCurrentPage(1)
        } else {
          setAllData(prev => [...prev, ...result.items])
          setCurrentPage(page)
        }

        setHasMore(result.hasMore)
        setHasData(result.items.length > 0)
        onSuccess?.(result.items)
      } catch (error) {
        console.error('Pagination load error:', error)
        onError?.(error as Error)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        isLoadingRef.current = false
      }
    },
    [fetchData, pageSize, extraParams, onSuccess, onError]
  )

  /**
   * extraParams 变化时自动重置并重新加载
   */
  useEffect(() => {
    // 首次渲染时不处理（由下面的初始加载处理）
    if (prevExtraParamsRef.current === null) {
      prevExtraParamsRef.current = extraParams
      return
    }

    // 检测 extraParams 是否真的变化了
    const prevParams = prevExtraParamsRef.current
    const currParams = extraParams
    const isChanged =
      Object.keys(prevParams).length !== Object.keys(currParams).length ||
      Object.keys(currParams).some(
        key => prevParams[key as keyof P] !== currParams[key as keyof P]
      )

    if (isChanged) {
      prevExtraParamsRef.current = extraParams
      // extraParams 变化时，重置并重新加载第一页
      setAllData([])
      setCurrentPage(1)
      setHasMore(true)
      setHasData(false)
      // 等待状态更新后加载
      setTimeout(() => loadData(1, true), 0)
    }
  }, [extraParams, loadData])

  /**
   * 首次加载
   */
  useEffect(() => {
    // 如果 extraParams 还未设置，等待 extraParams effect 处理
    if (prevExtraParamsRef.current === null) {
      prevExtraParamsRef.current = extraParams
    }
    loadData(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 加载下一页
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return
    await loadData(currentPage + 1, false)
  }, [currentPage, hasMore, isLoadingMore, loadData])

  /**
   * 加载指定页
   */
  const loadPage = useCallback(
    async (page: number) => {
      if (page < 1 || page === currentPage) return
      await loadData(page, page === 1)
    },
    [currentPage, loadData]
  )

  /**
   * 刷新数据
   */
  const refresh = useCallback(async () => {
    await loadData(1, true)
  }, [loadData])

  /**
   * 重置分页状态（不再自动重新加载，由 extraParams effect 处理）
   */
  const reset = useCallback(() => {
    setAllData([])
    setCurrentPage(1)
    setHasMore(true)
    setHasData(false)
  }, [])

  return {
    currentPage,
    data: allData,
    hasMore,
    isLoadingMore,
    isLoading,
    hasData,
    loadMore,
    loadPage,
    refresh,
    reset,
  }
}
