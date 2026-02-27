/**
 * 日期格式化工具函数
 * 提供统一的中文日期和时间格式化
 */

/**
 * 格式化日期为中文格式
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的日期字符串，例如："2024年1月15日"
 */
export function formatDateCN(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化时间为中文格式
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的时间字符串，例如："14:30"
 */
export function formatTimeCN(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化日期时间为中文格式
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的日期时间字符串，例如："2024年1月15日 14:30"
 */
export function formatDateTimeCN(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化完整星期信息
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的星期字符串，例如："星期一"
 */
export function formatWeekdayCN(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    weekday: 'long',
  });
}

/**
 * 格式化完整日期（含星期）
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的日期字符串，例如："2024年1月15日 星期一"
 */
export function formatDateWithWeekdayCN(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}
