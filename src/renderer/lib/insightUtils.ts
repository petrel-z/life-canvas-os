/**
 * 洞察工具函数
 */

/**
 * 系统维度类型
 */
export type SystemType =
  | 'FUEL' // 饮食系统
  | 'PHYSICAL' // 运动系统
  | 'INTELLECTUAL' // 认知系统/读书系统
  | 'OUTPUT' // 产出系统/工作系统
  | 'DREAM' // 梦想系统
  | 'ASSET' // 财务系统
  | 'CONNECTION' // 社交系统
  | 'ENVIRONMENT' // 环境系统

/**
 * 洞察类别配置
 */
export const INSIGHT_CATEGORIES = {
  celebration: {
    label: '值得庆祝',
    bgColor: 'bg-green-500/5 dark:bg-green-500/5',
    borderColor: 'border-green-500/20',
    textColor: 'text-green-600 dark:text-green-400',
    cardBg: 'bg-green-50 dark:bg-green-900/10',
  },
  warning: {
    label: '需要改进',
    bgColor: 'bg-amber-500/5 dark:bg-amber-500/5',
    borderColor: 'border-amber-500/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    cardBg: 'bg-amber-50 dark:bg-amber-900/10',
  },
  action: {
    label: '行动建议',
    bgColor: 'bg-blue-500/5 dark:bg-blue-500/5',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    cardBg: 'bg-blue-50 dark:bg-blue-900/10',
  },
} as const

/**
 * 系统名称映射
 */
export const SYSTEM_NAMES: Record<SystemType, string> = {
  FUEL: '饮食系统',
  PHYSICAL: '运动系统',
  INTELLECTUAL: '认知系统',
  OUTPUT: '产出系统',
  DREAM: '梦想系统',
  ASSET: '财务系统',
  CONNECTION: '社交系统',
  ENVIRONMENT: '环境系统',
}

/**
 * 系统颜色映射
 */
export const SYSTEM_COLORS: Record<SystemType, string> = {
  FUEL: '#F59E0B', // amber-500
  PHYSICAL: '#10B981', // emerald-500
  INTELLECTUAL: '#3B82F6', // blue-500
  OUTPUT: '#8B5CF6', // violet-500
  DREAM: '#EC4899', // pink-500
  ASSET: '#14B8A6', // teal-500
  CONNECTION: '#F97316', // orange-500
  ENVIRONMENT: '#84CC16', // lime-500
}

/**
 * 获取系统名称
 */
export function getSystemName(type: string): string {
  return SYSTEM_NAMES[type as SystemType] || type
}

/**
 * 获取系统颜色
 */
export function getSystemColor(type: string): string {
  return SYSTEM_COLORS[type as SystemType] || '#6B7280'
}

/**
 * 洞察项类型
 */
export interface InsightItem {
  category: SystemType | string
  insight: string
  type?: 'celebration' | 'warning' | 'action'
}

/**
 * 获取洞察类别
 */
export function getInsightCategory(
  text: string
): 'celebration' | 'warning' | 'action' {
  const lowerText = text.toLowerCase()

  // 简单关键词匹配
  if (
    lowerText.includes('好') ||
    lowerText.includes('优秀') ||
    lowerText.includes('庆祝') ||
    lowerText.includes('成功')
  ) {
    return 'celebration'
  }
  if (
    lowerText.includes('需要') ||
    lowerText.includes('改进') ||
    lowerText.includes('注意') ||
    lowerText.includes('建议')
  ) {
    return 'warning'
  }
  return 'action'
}

/**
 * 按类别分组洞察
 */
export function groupInsightsByCategory(insights: InsightItem[]): {
  celebration: InsightItem[]
  warning: InsightItem[]
  action: InsightItem[]
} {
  const grouped = {
    celebration: [] as InsightItem[],
    warning: [] as InsightItem[],
    action: [] as InsightItem[],
  }

  insights.forEach(item => {
    const category = item.type || getInsightCategory(item.insight)
    grouped[category].push(item)
  })

  return grouped
}
