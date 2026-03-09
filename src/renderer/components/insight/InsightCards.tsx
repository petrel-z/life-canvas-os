import { cn } from '~/renderer/lib/utils'
import {
  PartyPopper,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { getSystemName, getSystemColor } from '~/renderer/lib/insightUtils'

// 图标映射
const ICON_MAP = {
  celebration: PartyPopper,
  warning: AlertTriangle,
  action: Target,
} as const

// 类别配置
const CATEGORY_CONFIG = {
  celebration: {
    label: '值得庆祝',
    subtitle: '持续保持的优势',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    gradientHover: 'from-emerald-500/15 to-teal-500/15',
    border: 'border-emerald-500/20',
    borderHover: 'border-emerald-500/40',
    shadow: 'shadow-emerald-500/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
    barGradient: 'from-emerald-500 to-teal-500',
  },
  warning: {
    label: '需要改进',
    subtitle: '值得关注的领域',
    gradient: 'from-orange-500/10 to-amber-500/10',
    gradientHover: 'from-orange-500/15 to-amber-500/15',
    border: 'border-orange-500/20',
    borderHover: 'border-orange-500/40',
    shadow: 'shadow-orange-500/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    dotColor: 'bg-orange-500',
    barGradient: 'from-orange-500 to-amber-500',
  },
  action: {
    label: '行动建议',
    subtitle: '立即可行的建议',
    gradient: 'from-blue-500/10 to-indigo-500/10',
    gradientHover: 'from-blue-500/15 to-indigo-500/15',
    border: 'border-blue-500/20',
    borderHover: 'border-blue-500/40',
    shadow: 'shadow-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    barGradient: 'from-blue-500 to-indigo-500',
  },
} as const

export type InsightCategory = 'celebration' | 'warning' | 'action'

export interface InsightItem {
  category: string
  insight: string
}

export interface SystemScores {
  [key: string]: number | string
}

interface InsightCardProps {
  category: InsightCategory
  items: InsightItem[]
  systemScores: SystemScores
  avgScore: number
  trend: 'up' | 'down' | 'stable'
  isHovered: boolean
  onHover: (category: InsightCategory | null) => void
  maxItems?: number
}

export function InsightCard({
  category,
  items,
  systemScores,
  avgScore,
  trend,
  isHovered,
  onHover,
  maxItems = 3,
}: InsightCardProps) {
  const config = CATEGORY_CONFIG[category]
  const Icon = ICON_MAP[category]
  const displayItems = items.slice(0, maxItems)

  return (
    <div
      className={cn(
        'relative rounded-2xl p-6 transition-all duration-300 cursor-pointer overflow-hidden',
        `bg-gradient-to-br ${config.gradient} border ${config.border}`,
        `hover:${config.gradientHover} hover:${config.borderHover}`,
        isHovered
          ? `scale-105 shadow-2xl ${config.shadow} z-10`
          : 'scale-95 opacity-60'
      )}
      onMouseEnter={() => onHover(category)}
      onMouseLeave={() => onHover(null)}
    >
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-5">
        <div className={cn('p-3 rounded-xl', `${config.gradient}`)}>
          <Icon className={cn('w-6 h-6', config.textColor)} size={24} />
        </div>
        <div className="flex-1">
          <div className={cn('text-base font-bold', config.textColor)}>
            {config.label}
          </div>
          <div className="text-sm text-apple-textSec dark:text-white/40">
            {config.subtitle}
          </div>
        </div>
        {category !== 'action' && (
          <div className="flex items-center gap-1">
            <span className={cn('text-2xl font-bold', config.textColor)}>
              {avgScore}
            </span>
            {trend === 'up' && (
              <TrendingUp className="text-emerald-500" size={20} />
            )}
            {trend === 'down' && (
              <TrendingDown className="text-red-500" size={20} />
            )}
          </div>
        )}
      </div>

      {/* 洞察内容列表 - 增大字体 */}
      <div className="space-y-3 mb-5">
        {displayItems.length === 0 ? (
          <div className="text-center py-6 text-sm text-apple-textSec dark:text-white/40">
            暂无{config.label}内容
          </div>
        ) : (
          displayItems.map((item, index) => (
            <div
              className="flex items-start gap-3 text-sm text-apple-textMain dark:text-white/90"
              key={index}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full mt-1.5 shrink-0',
                  config.dotColor
                )}
              />
              <span className="flex-1 leading-relaxed">{item.insight}</span>
            </div>
          ))
        )}
      </div>

      {/* 底部评分条 */}
      <div className={cn('space-y-3 pt-4 border-t', config.border)}>
        {displayItems.slice(0, maxItems).map((item, index) => {
          const systemType = item.category.toLowerCase()
          const score = Number(systemScores[systemType]) || 0
          return (
            <div className="flex items-center gap-3" key={index}>
              <span className="text-xs text-apple-textSec dark:text-white/50 w-14 shrink-0">
                {getSystemName(systemType)}
              </span>
              <div className="flex-1 h-2.5 bg-apple-bg2 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    `bg-gradient-to-r ${config.barGradient}`
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-xs font-bold w-8 text-right',
                  config.textColor
                )}
              >
                {score}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 系统评分柱形图组件
interface SystemScoreChartProps {
  systemScores: SystemScores
  title?: string
}

export function SystemScoreChart({ systemScores }: SystemScoreChartProps) {
  return (
    <div className="space-y-4">
      {/* Y 轴和柱形图区域 */}
      <div className="flex items-end gap-2 h-48 px-2">
        {/* Y 轴刻度 */}
        <div className="flex flex-col justify-between h-full text-[10px] text-apple-textSec dark:text-white/40 pr-2">
          <span>100</span>
          <span>80</span>
          <span>60</span>
          <span>40</span>
          <span>20</span>
          <span>0</span>
        </div>

        {/* 柱形图和网格线 */}
        <div className="flex-1 relative flex items-end justify-around gap-2">
          {/* 网格线 */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[100, 80, 60, 40, 20, 0].map(level => (
              <div
                className="border-t border-apple-border dark:border-white/5 w-full"
                key={level}
              />
            ))}
          </div>

          {/* 柱子 */}
          {Object.entries(systemScores).map(([type, score]) => {
            const scoreNum = Number(score) || 0
            return (
              <div
                className="flex flex-col items-center flex-1 max-w-[60px] z-10"
                key={type}
              >
                {/* 柱形 */}
                <div className="relative w-full flex items-end justify-center h-[200px]">
                  <div
                    className="w-full max-w-[40px] rounded-t-md transition-all duration-500"
                    style={{
                      height: `${scoreNum}%`,
                      backgroundColor: getSystemColor(type),
                      opacity: 0.75,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* X 轴标签 */}
      <div className="flex justify-around gap-2 px-2">
        {Object.entries(systemScores).map(([type, score]) => {
          const scoreNum = Number(score) || 0
          return (
            <div
              className="flex flex-col items-center flex-1 max-w-[60px]"
              key={type}
            >
              <div
                className="text-xs font-bold px-2 py-1 rounded"
                style={{
                  color: getSystemColor(type),
                }}
              >
                {score}
              </div>
              <div className="text-[9px] text-apple-textSec dark:text-white/40 text-center truncate w-full">
                {getSystemName(type).split(' ')[0]}
              </div>
            </div>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t border-apple-border dark:border-white/5">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm opacity-75"
            style={{ backgroundColor: '#10b981' }}
          />
          <span className="text-xs text-apple-textSec dark:text-white/40">
            系统评分
          </span>
        </div>
      </div>
    </div>
  )
}
