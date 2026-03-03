/**
 * 日记业务逻辑 Hook
 */

import { useCallback } from 'react'
import { journalApi, type MoodType } from '~/renderer/api'
import type {
  JournalResponse,
  PaginatedJournalsResponse,
  JournalCreateRequest,
  JournalUpdateRequest,
} from '~/renderer/api/journal'
import type { JournalEntry } from '~/shared/types'
import { toast } from '~/renderer/lib/toast'

/**
 * API 错误类型
 */
export interface JournalApiError {
  code: number
  message: string
  data?: {
    errors?: Array<{
      field: string
      message: string
      value: any
    }>
  }
}

/**
 * 转换后端响应到前端格式
 */
function transformJournalToEntry(journal: JournalResponse): JournalEntry {
  return {
    id: journal.id.toString(),
    timestamp: new Date(journal.created_at).getTime(),
    title: journal.title,
    content: journal.content,
    mood: journal.mood || 'neutral',
    tags: journal.tags ? JSON.parse(journal.tags) : [],
    attachments: [],
    linkedDimensions: journal.related_system
      ? [journal.related_system as any]
      : undefined,
    isPrivate: journal.is_private,
  }
}

/**
 * 转换前端Entry到后端请求格式
 */
function transformEntryToCreateRequest(
  entry: Partial<JournalEntry>
): JournalCreateRequest {
  return {
    title: entry.title || '未命名日记',
    content: entry.content || '',
    mood: entry.mood,
    tags: entry.tags ? JSON.stringify(entry.tags) : undefined,
    related_system: entry.linkedDimensions?.[0],
    is_private: entry.isPrivate,
  }
}

function transformEntryToUpdateRequest(
  entry: Partial<JournalEntry>
): JournalUpdateRequest {
  const request: JournalUpdateRequest = {}
  if (entry.title !== undefined) request.title = entry.title
  if (entry.content !== undefined) request.content = entry.content
  if (entry.mood !== undefined) request.mood = entry.mood
  if (entry.tags !== undefined) request.tags = JSON.stringify(entry.tags)
  if (entry.linkedDimensions?.[0])
    request.related_system = entry.linkedDimensions[0]
  if (entry.isPrivate !== undefined) request.is_private = entry.isPrivate
  return request
}

export function useJournalApi() {
  /**
   * 获取日记列表
   */
  const listJournals = useCallback(
    async (params?: { page?: number; page_size?: number; mood?: MoodType }) => {
      const response = await journalApi.list(params)

      if (!response.ok) {
        const error = (await response.json()) as JournalApiError
        toast.error('获取日记列表失败', {
          description: error.message || '请稍后重试',
        })
        throw error
      }

      const result = (await response.json()) as {
        data: PaginatedJournalsResponse
      }
      return {
        ...result.data,
        items: result.data.items.map(transformJournalToEntry),
      }
    },
    []
  )

  /**
   * 获取日记详情
   */
  const getJournal = useCallback(
    async (id: number | string): Promise<JournalEntry> => {
      const response = await journalApi.get(
        typeof id === 'string' ? parseInt(id, 10) : id
      )

      if (!response.ok) {
        if (response.status === 404) {
          const error = (await response.json()) as JournalApiError
          toast.error('日记不存在', {
            description: error.message,
          })
          throw error
        }

        const error = (await response.json()) as JournalApiError
        toast.error('获取日记失败', {
          description: error.message || '请稍后重试',
        })
        throw error
      }

      const result = (await response.json()) as { data: JournalResponse }
      return transformJournalToEntry(result.data)
    },
    []
  )

  /**
   * 创建日记
   */
  const createJournal = useCallback(
    async (entry: Partial<JournalEntry>): Promise<JournalEntry> => {
      const request = transformEntryToCreateRequest(entry)
      const response = await journalApi.create(request)

      if (!response.ok) {
        const error = (await response.json()) as JournalApiError

        if (error.code === 422) {
          // 验证错误
          error.data?.errors?.forEach(err => {
            toast.error(`${err.field}: ${err.message}`)
          })
        } else {
          toast.error('创建日记失败', {
            description: error.message || '请稍后重试',
          })
        }
        throw error
      }

      const result = (await response.json()) as { data: JournalResponse }
      toast.success('日记创建成功')

      return transformJournalToEntry(result.data)
    },
    []
  )

  /**
   * 更新日记
   */
  const updateJournal = useCallback(
    async (
      id: number | string,
      entry: Partial<JournalEntry>
    ): Promise<JournalEntry> => {
      const request = transformEntryToUpdateRequest(entry)
      const response = await journalApi.update(
        typeof id === 'string' ? parseInt(id, 10) : id,
        request
      )

      if (!response.ok) {
        const error = (await response.json()) as JournalApiError

        if (response.status === 404) {
          toast.error('日记已被删除')
          throw error
        }

        if (error.code === 422) {
          toast.error('数据验证失败')
        } else {
          toast.error('更新日记失败', {
            description: error.message || '请稍后重试',
          })
        }
        throw error
      }

      const result = (await response.json()) as { data: JournalResponse }
      toast.success('日记更新成功')

      return transformJournalToEntry(result.data)
    },
    []
  )

  /**
   * 删除日记
   */
  const deleteJournal = useCallback(
    async (id: number | string): Promise<void> => {
      const response = await journalApi.delete(
        typeof id === 'string' ? parseInt(id, 10) : id
      )

      if (!response.ok) {
        const error = (await response.json()) as JournalApiError

        if (response.status === 404) {
          toast.success('日记已删除')
          return
        }

        toast.error('删除日记失败', {
          description: error.message || '请稍后重试',
        })
        throw error
      }

      toast.success('日记删除成功')
    },
    []
  )

  return {
    listJournals,
    getJournal,
    createJournal,
    updateJournal,
    deleteJournal,
  }
}
