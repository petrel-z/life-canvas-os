/**
 * Agent API Hook
 */

import { useCallback } from 'react'
import { apiRequest } from '~/renderer/api/client'

// 会话 ID 存储（实际应用中应该使用更持久的存储方式）
let currentSessionId: string | null = null

function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = `sess_${Math.random().toString(36).substring(2, 14)}`
  }
  return currentSessionId
}

export interface ChatResponse {
  response: string
  action_taken?: {
    id?: number
    title?: string
    content?: string
    mood?: string
    tags?: string[]
    created_at?: string
    [key: string]: unknown
  }
  requires_confirmation?: boolean
  confirmation_id?: string
  confirmation_message?: string
  session_id?: string
}

export interface ConfirmRequest {
  session_id: string
  confirmation_id: string
  confirmed: boolean
  code?: string
}

/**
 * Agent API Hook
 */
export function useAgentApi() {
  /**
   * 发送聊天请求
   */
  const chat = useCallback(async (message: string): Promise<ChatResponse> => {
    const sessionId = getSessionId()
    const response = await apiRequest('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
    })

    const result = await response.json()

    if (response.ok && result.code === 200) {
      return result.data as ChatResponse
    }

    throw new Error(result.message || '发送消息失败')
  }, [])

  /**
   * 发送流式聊天请求
   * 返回一个 AsyncIterator 用于接收流式响应
   */
  const chatStream = useCallback(
    async function* (message: string) {
      const sessionId = getSessionId()
      const response = await apiRequest('/api/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('流式请求失败')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法读取响应流')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // 解析 SSE 格式
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留不完整行

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6)
              if (data === '[DONE]') {
                yield { type: 'done', data: null }
                return
              }
              try {
                const parsed = JSON.parse(data)
                yield parsed
              } catch {
                // JSON 解析失败，跳过
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    },
    []
  )

  /**
   * 确认操作
   */
  const confirm = useCallback(
    async (request: ConfirmRequest): Promise<ChatResponse> => {
      const response = await apiRequest('/api/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        return result.data as ChatResponse
      }

      throw new Error(result.message || '确认操作失败')
    },
    []
  )

  /**
   * 获取会话历史
   */
  const getHistory = useCallback(
    async (sessionId: string, limit = 10) => {
      const response = await apiRequest(
        `/api/agent/history?session_id=${sessionId}&limit=${limit}`,
        {
          method: 'GET',
        }
      )

      const result = await response.json()

      if (response.ok && result.code === 200) {
        return result.data.messages || []
      }

      throw new Error(result.message || '获取历史失败')
    },
    []
  )

  /**
   * 删除会话
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      const response = await apiRequest(`/api/agent/session/${sessionId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        return true
      }

      throw new Error(result.message || '删除会话失败')
    },
    []
  )

  /**
   * 获取会话列表
   */
  const getSessions = useCallback(async () => {
    const response = await apiRequest('/api/agent/sessions', {
      method: 'GET',
    })

    const result = await response.json()

    if (response.ok && result.code === 200) {
      return result.data
    }

    throw new Error(result.message || '获取会话列表失败')
  }, [])

  /**
   * 获取会话详情
   */
  const getSession = useCallback(
    async (sessionId: string) => {
      const response = await apiRequest(`/api/agent/session/${sessionId}`, {
        method: 'GET',
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        return result.data
      }

      throw new Error(result.message || '获取会话详情失败')
    },
    []
  )

  /**
   * 切换会话
   */
  const switchSession = useCallback((sessionId: string) => {
    currentSessionId = sessionId
    return sessionId
  }, [])

  /**
   * 创建新会话
   */
  const createSession = useCallback(() => {
    currentSessionId = null
    return getSessionId()
  }, [])

  return {
    chat,
    chatStream,
    confirm,
    getHistory,
    deleteSession,
    getSessions,
    getSession,
    switchSession,
    createSession,
  }
}
