/**
 * PIN 相关配置和常量
 */

export const PIN_CONFIG = {
  /** PIN 码长度 */
  LENGTH: 6,

  /** 默认锁定秒数 */
  DEFAULT_LOCK_SECONDS: 30,

  /** 导航延迟（毫秒） */
  NAVIGATION_DELAY: 1000,

  /** 最大尝试次数（参考） */
  MAX_ATTEMPTS: 5,
} as const;

/**
 * PIN 相关的消息文本
 */
export const PIN_MESSAGES = {
  INVALID_LENGTH: `请输入 ${PIN_CONFIG.LENGTH} 位数字 PIN`,
  VERIFY_FAILED: 'PIN 验证失败',
  LOCKED: 'PIN 已锁定',
  NETWORK_ERROR: '网络错误，请检查后端服务是否运行',
  CHANGE_SUCCESS: 'PIN 修改成功',
  CHANGE_SUCCESS_DESC: '请妥善保管您的新 PIN 码',
  DELETE_SUCCESS: 'PIN 已删除',
  DELETE_SUCCESS_DESC: '私密日记功能已关闭',
  DELETE_WARNING: '危险操作',
  PIN_MISMATCH: '两次输入的 PIN 不一致',
  PIN_SAME_AS_OLD: '新 PIN 不能与旧 PIN 相同',
  PIN_MATCH: 'PIN 码一致',
  PIN_NO_MATCH: 'PIN 码不一致',
} as const;
