/**
 * 事件总线模块
 *
 * 用于 Agent 模块内部的事件通信，支持数据变更自动刷新
 */

type EventCallback = (data: unknown) => void

interface EventNode {
  callbacks: EventCallback[]
}

export class EventEmitter {
  private events: Map<string, EventNode>

  constructor() {
    this.events = new Map()
  }

  /**
   * 订阅事件
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, { callbacks: [] })
    }

    const node = this.events.get(event)!
    node.callbacks.push(callback)

    // 返回取消订阅函数
    return () => {
      this.off(event, callback)
    }
  }

  /**
   * 取消订阅
   */
  off(event: string, callback: EventCallback): void {
    const node = this.events.get(event)
    if (!node) return

    node.callbacks = node.callbacks.filter(cb => cb !== callback)

    if (node.callbacks.length === 0) {
      this.events.delete(event)
    }
  }

  /**
   * 触发事件
   */
  emit(event: string, data?: unknown): void {
    const node = this.events.get(event)
    if (!node) return

    // 异步执行所有回调
    Promise.resolve().then(() => {
      node.callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Event callback error for "${event}":`, error)
        }
      })
    })
  }

  /**
   * 触发事件（同步）
   */
  emitSync(event: string, data?: unknown): void {
    const node = this.events.get(event)
    if (!node) return

    node.callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Event callback error for "${event}":`, error)
      }
    })
  }

  /**
   * 清空事件
   */
  clear(): void {
    this.events.clear()
  }

  /**
   * 获取事件订阅数
   */
  getListenerCount(event: string): number {
    const node = this.events.get(event)
    return node ? node.callbacks.length : 0
  }
}

// 全局事件总线单例
let globalEventBus: EventEmitter | null = null

export function getEventBus(): EventEmitter {
  if (!globalEventBus) {
    globalEventBus = new EventEmitter()
  }
  return globalEventBus
}

// 预定义事件类型
export const AgentEvents = {
  // 数据变更事件
  JOURNAL_CREATED: 'journal:created',
  JOURNAL_UPDATED: 'journal:updated',
  JOURNAL_DELETED: 'journal:deleted',

  MEMORY_CREATED: 'memory:created',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_DELETED: 'memory:deleted',

  SYSTEM_SCORE_UPDATED: 'system:score_updated',
  SYSTEM_ACTION_ADDED: 'system:action_added',
  SYSTEM_ACTION_COMPLETED: 'system:action_completed',

  INSIGHT_GENERATED: 'insight:generated',

  // 会话事件
  SESSION_CREATED: 'session:created',
  SESSION_SWITCHED: 'session:switched',
  SESSION_DELETED: 'session:deleted',

  // 通用事件
  DATA_REFRESH: 'data:refresh',  // 数据刷新请求
  STATE_CHANGED: 'state:changed',  // 状态变更
} as const
