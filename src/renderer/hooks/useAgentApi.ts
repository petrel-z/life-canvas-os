/**
 * Agent API Hook - 适配层
 *
 * 基于新的 agentApi 封装，保持向后兼容
 */

import { useCallback, useRef } from 'react'
import {
  agentApi,
  type ChatResponse,
  type ConfirmRequest,
} from '~/renderer/api/agent'

/**
 * Agent API Hook
 *
 * @deprecated 建议直接使用 agentApi，此 hook 仅用于向后兼容
 */
export function useAgentApi() {
  // 用于存储当前的 AbortController
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 中断当前的流式请求
   */
  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  /**
   * 发送聊天请求
   */
  const chat = useCallback(async (message: string) => {
    return await agentApi.chat(message)
  }, [])

  /**
   * 发送流式聊天请求
   */
  const chatStream = useCallback(async function* (
    message: string,
    sessionId: string
  ) {
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()
    const abortSignal = abortControllerRef.current.signal

    try {
      // 使用新的 agentApi.chatStream
      const stream = agentApi.chatStream(message, sessionId, abortSignal)
      for await (const chunk of stream) {
        yield chunk
      }
    } finally {
      abortControllerRef.current = null
    }
  }, [])

  // 包装函数，用于在组件中调用
  const chatStreamWrapper = useCallback(
    async function* (message: string) {
      const sessionId = agentApi.getCurrentSessionId()
      const stream = chatStream(message, sessionId)
      for await (const chunk of stream) {
        yield chunk
      }
    },
    [chatStream]
  )

  /**
   * 确认操作
   */
  const confirm = useCallback(async (request: ConfirmRequest) => {
    return await agentApi.confirm(request)
  }, [])

  /**
   * 获取会话历史
   */
  const getHistory = useCallback(async (sessionId: string, limit = 10) => {
    return await agentApi.getHistory(sessionId, limit)
  }, [])

  /**
   * 删除会话
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    await agentApi.deleteSession(sessionId)
    // 同时从 localStorage 历史列表中移除
    agentApi.removeSessionFromList(sessionId)
  }, [])

  /**
   * 获取会话列表
   */
  const getSessions = useCallback(async () => {
    return await agentApi.getSessions()
  }, [])

  /**
   * 获取会话详情
   */
  const getSession = useCallback(async (sessionId: string) => {
    return await agentApi.getSession(sessionId)
  }, [])

  /**
   * 切换会话
   */
  const switchSession = useCallback((sessionId: string) => {
    return agentApi.switchSession(sessionId)
  }, [])

  /**
   * 创建新会话
   */
  const createSession = useCallback(() => {
    return agentApi.createSession()
  }, [])

  /**
   * 获取会话历史列表
   */
  const getSessionList = useCallback(() => {
    return agentApi.getSessionList()
  }, [])

  /**
   * 从历史列表中移除会话
   */
  const removeSessionFromList = useCallback((sessionId: string) => {
    agentApi.removeSessionFromList(sessionId)
  }, [])

  return {
    chat,
    chatStream: chatStreamWrapper,
    abortStream,
    confirm,
    getHistory,
    deleteSession,
    getSessions,
    getSession,
    switchSession,
    createSession,
    getSessionList,
    removeSessionFromList,
    getCurrentSessionId: agentApi.getCurrentSessionId,
  }
}

// 重新导出类型
export type { ChatResponse, ConfirmRequest }
export type {
  SessionSummary,
  SessionMessage,
  HistoryResponse,
  SessionsResponse,
  SessionDetailResponse,
} from '~/renderer/api/agent'

// 重新导出辅助函数
export {
  getSessionId,
  setSessionId,
  clearSessionId,
  generateSessionId,
  getSessionHistory,
  saveSessionToHistory,
  removeSessionFromHistory,
} from '~/renderer/api/agent'
