import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '~/renderer/components/ui/button'
import { GlassCard } from '~/renderer/components/GlassCard'
import type { InsightResponse } from '~/renderer/api/ai'
import { toast } from 'sonner'
import {
  INSIGHT_CATEGORIES,
  getSystemName,
  getSystemColor,
  groupInsightsByCategory,
} from '~/renderer/lib/insightUtils'
import {
  InsightCard,
  SystemScoreChart,
  type InsightCategory,
} from '~/renderer/components/insight/InsightCards'

export function InsightHistoryDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [insight, setInsight] = useState<InsightResponse | null>(null)
  const [hoveredCard, setHoveredCard] = useState<
    'celebration' | 'warning' | 'action' | null
  >(null)

  useEffect(() => {
    // 从路由状态获取洞察数据
    const insightData = location.state?.insight as InsightResponse

    if (!insightData) {
      toast.error('未找到洞察数据')
      navigate('/insights/history')
      return
    }

    setInsight(insightData)
  }, [location.state, navigate])

  if (!insight) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-apple-textSec dark:text-white/60">加载中...</div>
      </div>
    )
  }

  // 按类别分组洞察内容
  const groupedInsights = groupInsightsByCategory(insight.content)

  // 计算每个类别的平均分数和趋势
  const getCategoryStats = (category: keyof typeof groupedInsights) => {
    const items = groupedInsights[category]
    if (items.length === 0) return { avgScore: 0, trend: 'stable' as const }

    const scores = items.map((item) => {
      const systemType = item.category.toLowerCase()
      const score = insight.system_scores[systemType] || 0
      return score
    })

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

    // 根据类别判断趋势
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (category === 'celebration') trend = 'up'
    else if (category === 'warning') trend = 'down'
    else trend = 'stable'

    return { avgScore: Math.round(avgScore), trend }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 页面头部 */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            className="rounded-full"
            onClick={() => navigate(-1)}
            size="icon"
            variant="ghost"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-apple-textMain dark:text-white tracking-tight">
              洞察详情
            </h1>
            <p className="text-apple-textSec dark:text-white/40 mt-1">
              生成于{' '}
              {new Date(insight.generated_at_ts).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </header>

      {/* 洞察内容 */}
      <div className="space-y-6">
        {/* 三个卡片横向排列 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            category="celebration"
            items={groupedInsights.celebration}
            systemScores={insight.system_scores}
            avgScore={getCategoryStats('celebration').avgScore}
            trend={getCategoryStats('celebration').trend}
            isHovered={hoveredCard === 'celebration'}
            onHover={setHoveredCard}
          />
          <InsightCard
            category="warning"
            items={groupedInsights.warning}
            systemScores={insight.system_scores}
            avgScore={getCategoryStats('warning').avgScore}
            trend={getCategoryStats('warning').trend}
            isHovered={hoveredCard === 'warning'}
            onHover={setHoveredCard}
          />
          <InsightCard
            category="action"
            items={groupedInsights.action}
            systemScores={insight.system_scores}
            avgScore={0}
            trend="stable"
            isHovered={hoveredCard === 'action'}
            onHover={setHoveredCard}
          />
        </div>

        {/* 系统评分快照 - 柱形图 */}
        <GlassCard className="p-6" title="系统评分快照">
          <SystemScoreChart systemScores={insight.system_scores} />
        </GlassCard>

        {/* AI 提供商信息 */}
        <div className="text-center text-sm text-apple-textSec dark:text-white/40">
          由 {insight.provider_used.toUpperCase()} 提供
        </div>
      </div>
    </div>
  )
}
