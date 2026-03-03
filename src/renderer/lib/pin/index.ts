/**
 * PIN 配置常量
 */
export const PIN_CONFIG = {
  /** PIN 码长度 */
  LENGTH: 6,
  /** 最大尝试次数 */
  MAX_ATTEMPTS: 3,
  /** 锁定时长（秒） */
  LOCK_DURATION_SECONDS: 30,
  /** 默认锁定秒数（用于错误处理） */
  DEFAULT_LOCK_SECONDS: 30,
  /** 导航延迟（毫秒） */
  NAVIGATION_DELAY: 1500,
} as const

/**
 * PIN 消息常量
 */
export const PIN_MESSAGES = {
  /** 无效长度 */
  INVALID_LENGTH: `请输入 ${PIN_CONFIG.LENGTH} 位数字 PIN`,
  /** PIN 不一致 */
  PIN_MISMATCH: '两次输入的 PIN 不一致',
  /** 新 PIN 与旧 PIN 相同 */
  PIN_SAME_AS_OLD: '新 PIN 不能与旧 PIN 相同',
  /** 修改成功 */
  CHANGE_SUCCESS: 'PIN 修改成功',
  /** 修改成功描述 */
  CHANGE_SUCCESS_DESC: '请使用新 PIN 码进行验证',
  /** 设置成功 */
  SETUP_SUCCESS: 'PIN 设置成功',
  /** 设置成功描述 */
  SETUP_SUCCESS_DESC: '您现在可以使用私密日记功能了',
  /** 删除成功 */
  DELETE_SUCCESS: 'PIN 已删除',
  /** 删除成功描述 */
  DELETE_SUCCESS_DESC: '您已关闭 PIN 验证功能',
  /** 删除警告 */
  DELETE_WARNING: '删除 PIN 后将无法保护私密日记',
} as const

/**
 * PIN API 错误类型
 */
export interface PinApiError {
  code: number
  message: string
  data?: {
    attempts_remaining?: number
    remaining_seconds?: number
    conflict?: string
    hint?: string
    [key: string]: any
  }
  timestamp?: number
}

/**
 * PIN API 响应类型
 */
export interface PinApiResponse {
  code: number
  message: string
  data?: any
  timestamp: number
}
