/**
 * PIN 相关类型定义
 */

/**
 * PIN 设置请求
 */
export interface PinSetupRequest {
  pin: string
}

/**
 * PIN 验证请求
 */
export interface PinVerifyRequest {
  pin: string
}

/**
 * PIN 修改请求
 */
export interface PinChangeRequest {
  old_pin: string
  new_pin: string
}

/**
 * PIN 删除请求
 */
export interface PinDeleteRequest {
  pin: string
}

/**
 * PIN API 响应
 */
export interface PinApiResponse {
  code: number
  message: string
  data?: any
  timestamp: number
}
