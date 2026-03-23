/**
 * Agent API - AI 助手聊天相关接口
 */

import { apiRequest } from './client'

// ============ 类型定义 ============

/**
 * 聊天响应
 */
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

/**
 * 确认请求
 */
export interface ConfirmRequest {
  session_id: string
  confirmation_id: string
  confirmed: boolean
  code?: string
}

/**
 * 会话消息
 */
export interface SessionMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

/**
 * 会话历史响应
 */
export interface HistoryResponse {
  messages: SessionMessage[]
  session_id: string
}

/**
 * 会话摘要
 */
export interface SessionSummary {
  session_id: string
  message_count: number
  last_message_time: string | null
  last_message_preview: string | null
  last_message_role: string | null
}

/**
 * 会话列表响应
 */
export interface SessionsResponse {
  sessions: SessionSummary[]
}

/**
 * 会话详情响应
 */
export interface SessionDetailResponse {
  session_id: string
  messages: Array<{
    role: string
    content: string
  }>
  operations: Array<{
    skill: string
    params: Record<string, unknown>
    success: boolean
  }>
  references: Record<string, string>
  token_count: number
}

// ============ localStorage 管理 ============

const SESSION_ID_STORAGE_KEY = 'life_canvas_agent_session_id'
const SESSION_ID_LIST_STORAGE_KEY = 'life_canvas_agent_session_ids'

/**
 * 从 localStorage 获取或创建会话 ID
 */
function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_STORAGE_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId)
  }
  return sessionId
}

/**
 * 设置会话 ID 到 localStorage
 */
function setSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId)
  saveSessionToHistory(sessionId)
}

/**
 * 从 localStorage 清除当前会话 ID
 */
function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_STORAGE_KEY)
}

/**
 * 生成新的会话 ID
 */
function generateSessionId(): string {
  return `sess_${Math.random().toString(36).substring(2, 14)}`
}

/**
 * 保存会话 ID 到历史列表
 */
function saveSessionToHistory(sessionId: string): void {
  try {
    const existing = localStorage.getItem(SESSION_ID_LIST_STORAGE_KEY)
    const sessionList: string[] = existing ? JSON.parse(existing) : []
    if (!sessionList.includes(sessionId)) {
      sessionList.unshift(sessionId)
      localStorage.setItem(
        SESSION_ID_LIST_STORAGE_KEY,
        JSON.stringify(sessionList)
      )
    }
  } catch (error) {
    console.error('Failed to save session to history:', error)
  }
}

/**
 * 获取会话历史列表
 */
function getSessionHistory(): string[] {
  try {
    const existing = localStorage.getItem(SESSION_ID_LIST_STORAGE_KEY)
    return existing ? JSON.parse(existing) : []
  } catch (error) {
    console.error('Failed to get session history:', error)
    return []
  }
}

/**
 * 从会话历史列表中移除
 */
function removeSessionFromHistory(sessionId: string): void {
  try {
    const existing = localStorage.getItem(SESSION_ID_LIST_STORAGE_KEY)
    const sessionList: string[] = existing ? JSON.parse(existing) : []
    const filtered = sessionList.filter(id => id !== sessionId)
    localStorage.setItem(SESSION_ID_LIST_STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to remove session from history:', error)
  }
}

// ============ API 方法 ============

export const agentApi = {
  /**
   * 发送聊天请求
   */
  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    const sessionIdToUse = sessionId || getSessionId()
    const response = await apiRequest('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionIdToUse,
      }),
    })

    const result = await response.json()

    if (response.ok && result.code === 200) {
      return result.data as ChatResponse
    }

    throw new Error(result.message || '发送消息失败')
  },

  /**
   * 发送流式聊天请求
   * 返回一个 AsyncIterator 用于接收流式响应
   */
  async *chatStream(
    message: string,
    sessionId?: string,
    signal?: AbortSignal
  ): AsyncGenerator<{ type: string; data: unknown }> {
    const sessionIdToUse = sessionId || getSessionId()

    const response = await apiRequest('/api/agent/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionIdToUse,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || '流式请求失败')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        if (signal?.aborted) {
          break
        }
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // 解析 SSE 格式
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

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

  /**
   * 确认操作
   */
  async confirm(request: ConfirmRequest): Promise<ChatResponse> {
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

  /**
   * 获取会话历史
   */
  async getHistory(sessionId: string, limit = 10): Promise<SessionMessage[]> {
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

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const response = await apiRequest(`/api/agent/session/${sessionId}`, {
      method: 'DELETE',
    })

    const result = await response.json()

    if (response.ok && result.code === 200) {
      return true
    }

    throw new Error(result.message || '删除会话失败')
  },

  /**
   * 获取会话列表
   */
  async getSessions(): Promise<SessionSummary[]> {
    const response = await apiRequest('/api/agent/sessions', {
      method: 'GET',
    })

    const result = await response.json()

    if (response.ok && result.code === 200) {
      return (result.data as SessionsResponse).sessions || []
    }

    throw new Error(result.message || '获取会话列表失败')
  },

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string): Promise<SessionDetailResponse> {
    const response = await apiRequest(`/api/agent/session/${sessionId}`, {
      method: 'GET',
    })

    const result = await response.json()

    if (response.ok && result.code === 200) {
      return result.data
    }

    throw new Error(result.message || '获取会话详情失败')
  },

  // ============ 会话管理辅助方法 ============

  /**
   * 获取当前会话 ID
   */
  getCurrentSessionId(): string {
    return getSessionId()
  },

  /**
   * 设置会话 ID
   */
  setSessionId,

  /**
   * 清除当前会话 ID
   */
  clearSessionId,

  /**
   * 生成新的会话 ID 并设置为当前会话
   */
  createSession(): string {
    const newSessionId = generateSessionId()
    setSessionId(newSessionId)
    return newSessionId
  },

  /**
   * 切换会话
   */
  switchSession(sessionId: string): string {
    setSessionId(sessionId)
    return sessionId
  },

  /**
   * 获取会话历史列表
   */
  getSessionList(): string[] {
    return getSessionHistory()
  },

  /**
   * 从历史列表中移除会话
   */
  removeSessionFromList(sessionId: string): void {
    removeSessionFromHistory(sessionId)
  },
}

// ============ 导出 ============

export {
  getSessionId,
  setSessionId,
  clearSessionId,
  generateSessionId,
  getSessionHistory,
  saveSessionToHistory,
  removeSessionFromHistory,
}
