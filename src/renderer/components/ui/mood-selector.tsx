import { cn } from '~/renderer/lib/utils'
import { MOODS, type MoodType } from '~/renderer/lib/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/renderer/components/ui/tooltip'

export type MoodSelectorVariant = 'icon' | 'emoji'

export interface MoodSelectorProps {
  value: MoodType
  onChange: (mood: MoodType) => void
  variant?: MoodSelectorVariant
  className?: string
}

/**
 * 心情选择器组件
 * @variant 'icon' - 紧凑图标模式，适合快速记录
 * @variant 'emoji' - 图文模式，适合编辑器（使用相同的图标风格）
 */
export function MoodSelector({
  value,
  onChange,
  variant = 'icon',
  className,
}: MoodSelectorProps) {
  if (variant === 'emoji') {
    return (
      <TooltipProvider>
        <div className={cn('flex gap-4', className)}>
          {MOODS.map(m => (
            <Tooltip key={m.type}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'flex-1 p-4 rounded-xl transition-all flex flex-col items-center gap-2',
                    value === m.type
                      ? 'bg-apple-bg2 dark:bg-white/10 scale-105 shadow-md'
                      : 'opacity-50 hover:opacity-80 hover:scale-105'
                  )}
                  onClick={() => onChange(m.type)}
                >
                  <m.icon className={m.color} size={40} />
                  <span className="text-xs font-medium text-apple-textSec dark:text-white/60">
                    {m.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{m.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    )
  }

  // icon variant (默认)
  return (
    <TooltipProvider>
      <div className={cn('flex gap-3', className)}>
        {MOODS.map(m => (
          <Tooltip key={m.type}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'p-2 rounded-xl transition-all',
                  value === m.type
                    ? 'bg-apple-bg2 dark:bg-white/10 scale-110 shadow-sm'
                    : 'opacity-40 hover:opacity-100'
                )}
                onClick={() => onChange(m.type)}
              >
                <m.icon className={m.color} size={28} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{m.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
