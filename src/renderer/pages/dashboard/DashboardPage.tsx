import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import { useApp } from '~/renderer/contexts/AppContext'
import { DIMENSIONS } from '~/renderer/lib/constants'
import { RadarChartCard } from '~/renderer/components/canvas/RadarChartCard'
import { AIInsightCard } from '~/renderer/components/canvas/AIInsightCard'
import { LifeProgressCard } from '~/renderer/components/canvas/LifeProgressCard'
import { GlassCard } from '~/renderer/components/GlassCard'

export function DashboardPage() {
  const { state } = useApp()

  // 计算平衡总分
  const overallBalance = useMemo(() => {
    const values = Object.values(state.dimensions)
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }, [state.dimensions])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 页面头部 */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-apple-textMain dark:text-white tracking-tight">
            欢迎回来，
            <span className="text-apple-accent">{state.user.name}</span>
          </h1>
          <p className="text-apple-textSec dark:text-white/40 mt-1 text-lg">
            这是您当前的生命画布状态
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-apple-textTer dark:text-white/30 uppercase tracking-widest font-bold">
            平衡总分
          </div>
          <div className="text-5xl font-black text-apple-textMain dark:text-white">
            {overallBalance}%
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 雷达图卡片 */}
        <RadarChartCard />

        {/* 右侧卡片组 */}
        <div className="flex flex-col gap-6">
          <AIInsightCard />
          <LifeProgressCard />
        </div>
      </div>

      {/* 八维小卡片网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 pt-4">
        {DIMENSIONS.map(d => (
          <GlassCard
            className="!p-4 flex flex-col items-center text-center gap-2 hover:-translate-y-1 shadow-apple-soft transition-all cursor-pointer"
            key={d.type}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1 shadow-sm"
              style={{ backgroundColor: `${d.color}15`, color: d.color }}
            >
              <Heart size={20} />
            </div>
            <div className="text-[10px] uppercase font-bold text-apple-textTer dark:text-white/40 tracking-widest truncate w-full">
              {d.label.split(' ')[0]}
            </div>
            <div className="text-xl font-bold text-apple-textMain dark:text-white">
              {state.dimensions[d.type]}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
