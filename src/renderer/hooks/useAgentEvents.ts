/**
 * 事件总线 Hook
 *
 * 用于订阅 Agent 模块的事件
 */

import { useEffect, useCallback } from 'react'
import { getEventBus, AgentEvents } from '~/renderer/lib/event-bus'

type EventCallback = (data: unknown) => void

/**
 * 订阅 Agent 事件
 */
export function useAgentEvents(
  event: string,
  callback: EventCallback,
  deps: unknown[] = []
) {
  useEffect(() => {
    const eventBus = getEventBus()
    const unsubscribe = eventBus.on(event, callback)

    return () => {
      unsubscribe()
    }
  }, deps)
}

/**
 * 订阅多个 Agent 事件
 */
export function useAgentEventsBatch(
  events: string[],
  callback: EventCallback,
  deps: unknown[] = []
) {
  useEffect(() => {
    const eventBus = getEventBus()
    const unsubscribers = events.map(event =>
      eventBus.on(event, callback)
    )

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, deps)
}

/**
 * 触发 Agent 事件
 */
export function useEmitAgentEvent() {
  const eventBus = getEventBus()

  const emit = useCallback(
    (event: string, data?: unknown) => {
      eventBus.emit(event, data)
    },
    []
  )

  const emitSync = useCallback(
    (event: string, data?: unknown) => {
      eventBus.emitSync(event, data)
    },
    []
  )

  return { emit, emitSync }
}

/**
 * 数据刷新 Hook
 *
 * 订阅数据刷新事件，触发回调
 */
export function useDataRefresh(
  callback: EventCallback,
  deps: unknown[] = []
) {
  useAgentEvents(AgentEvents.DATA_REFRESH, callback, deps)
}

/**
 * 日记事件 Hook
 */
export function useJournalEvents(callbacks: {
  onCreated?: EventCallback
  onUpdated?: EventCallback
  onDeleted?: EventCallback
}) {
  const { onCreated, onUpdated, onDeleted } = callbacks

  useAgentEvents(
    AgentEvents.JOURNAL_CREATED,
    useCallback(data => onCreated?.(data), [onCreated]),
    [onCreated]
  )

  useAgentEvents(
    AgentEvents.JOURNAL_UPDATED,
    useCallback(data => onUpdated?.(data), [onUpdated]),
    [onUpdated]
  )

  useAgentEvents(
    AgentEvents.JOURNAL_DELETED,
    useCallback(data => onDeleted?.(data), [onDeleted]),
    [onDeleted]
  )
}

/**
 * 系统事件 Hook
 */
export function useSystemEvents(callbacks: {
  onScoreUpdated?: EventCallback
  onActionAdded?: EventCallback
  onActionCompleted?: EventCallback
}) {
  const { onScoreUpdated, onActionAdded, onActionCompleted } = callbacks

  useAgentEvents(
    AgentEvents.SYSTEM_SCORE_UPDATED,
    useCallback(data => onScoreUpdated?.(data), [onScoreUpdated]),
    [onScoreUpdated]
  )

  useAgentEvents(
    AgentEvents.SYSTEM_ACTION_ADDED,
    useCallback(data => onActionAdded?.(data), [onActionAdded]),
    [onActionAdded]
  )

  useAgentEvents(
    AgentEvents.SYSTEM_ACTION_COMPLETED,
    useCallback(data => onActionCompleted?.(data), [onActionCompleted]),
    [onActionCompleted]
  )
}

// 导出事件类型
export { AgentEvents }
