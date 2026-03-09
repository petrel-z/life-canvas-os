import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, History, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '~/renderer/components/ui/button'
import { GlassCard } from '~/renderer/components/GlassCard'
import { aiApi, type InsightResponse } from '~/renderer/api/ai'
import { toast } from 'sonner'
import {
  getSystemName,
  getSystemColor,
} from '~/renderer/lib/insightUtils'
import {
  InsightCard,
  SystemScoreChart,
  type InsightCategory,
} from '~/renderer/components/insight/InsightCards'

export function InsightDetailPage() {
  const navigate = useNavigate()
  const [insight, setInsight] = useState<InsightResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<
    'celebration' | 'warning' | 'action' | null
  >(null)

  // 使用 useRef 防止 StrictMode 双重调用
  const isLoadingRef = useRef(false)

  // 加载最新洞察
  const loadLatestInsight = async () => {
    // 防止重复调用
    if (isLoadingRef.current) {
      return
    }

    try {
      isLoadingRef.current = true
      setIsLoading(true)
      const response = await aiApi.getLatestInsight()

      if (!response.ok) {
        if (response.status === 404) {
          // 没有洞察数据
          setInsight(null)
          return
        }
        const error = await response.json()
        toast.error('加载洞察失败', {
          description: error.detail?.message || '请稍后重试',
        })
        return
      }

      const result = await response.json()
      setInsight(result.data)
    } catch (error) {
      console.error('Failed to load insight:', error)
      toast.error('加载洞察失败', {
        description: '请稍后重试',
      })
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }

  // 生成洞察
  const handleGenerate = async (force = false) => {
    try {
      setIsGenerating(true)
      toast.loading('正在生成洞察...', {
        description: 'AI 正在分析您的数据，这可能需要几秒钟',
        id: 'generate-insight',
      })

      const response = await aiApi.generateInsight({ force })

      if (!response.ok) {
        const error = await response.json()

        // 如果是 AI 服务未配置的特殊错误，显示提示信息
        const description =
          error.code === 424
            ? error.data?.hint || error.message
            : error.message || '请稍后重试'

        toast.error('生成洞察失败', {
          id: 'generate-insight',
          description,
        })
        return
      }

      const result = await response.json()

      // 检查是否达到每日限制
      if (result.data._limit_reached === true) {
        toast.warning('今日洞察次数已上限', {
          id: 'generate-insight',
          description: '每日只能生成 3 次洞察，请明天再来~',
        })
        return
      }

      // 更新洞察数据
      setInsight(result.data)

      toast.success('洞察生成成功', {
        id: 'generate-insight',
        description: 'AI 已完成分析',
      })
    } catch (error) {
      console.error('Failed to generate insight:', error)
      toast.error('生成洞察失败', {
        id: 'generate-insight',
        description: '请稍后重试',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    loadLatestInsight()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-apple-accent" />
      </div>
    )
  }

  // 没有洞察数据
  if (!insight) {
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
                AI 智能洞察
              </h1>
              <p className="text-apple-textSec dark:text-white/40 mt-1">
                暂无洞察结果
              </p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => navigate('/insights/history')}
            variant="outline"
          >
            <History size={16} />
            历史洞察
          </Button>
        </header>

        {/* 空状态 */}
        <div className="glass-effect rounded-2xl p-12 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="p-6 rounded-full bg-apple-accent/10">
              <Sparkles className="w-12 h-12 text-apple-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-apple-textMain dark:text-white">
                暂无洞察结果
              </h3>
              <p className="text-apple-textSec dark:text-white/60 max-w-md">
                点击下方按钮，AI
                将分析您的维度评分、日记记录等数据，为您生成个性化洞察
              </p>
            </div>
            <Button
              className="min-w-[200px]"
              disabled={isGenerating}
              onClick={() => handleGenerate(false)}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成洞察
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 按类别分组洞察内容 - 按索引位置分配
  // content[0] = celebration, content[1] = warning, content[2] = action
  const groupedInsights = {
    celebration: insight.content[0] ? [insight.content[0]] : [],
    warning: insight.content[1] ? [insight.content[1]] : [],
    action: insight.content[2] ? [insight.content[2]] : [],
  }

  // 计算每个类别的平均分数和趋势
  const getCategoryStats = (category: keyof typeof groupedInsights) => {
    const items = groupedInsights[category]
    if (items.length === 0) return { avgScore: 0, trend: 'stable' as const }

    const scores = items.map(item => {
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

  // 有洞察数据
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
              AI 智能洞察
            </h1>
            <p className="text-apple-textSec dark:text-white/40 mt-1">
              生成于 {new Date(insight.generated_at_ts).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2"
            onClick={() => navigate('/insights/history')}
            variant="outline"
          >
            <History size={16} />
            历史洞察
          </Button>
          <Button
            className="gap-2"
            disabled={isGenerating}
            onClick={() => handleGenerate(true)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                重新生成
              </>
            )}
          </Button>
        </div>
      </header>

      {/* 洞察内容 */}
      <div className="space-y-6 relative">
        {/* 生成中的加载遮罩 */}
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-2xl">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-apple-accent mx-auto" />
              <p className="text-lg font-semibold text-apple-textMain dark:text-white">
                AI 正在分析您的数据...
              </p>
              <p className="text-sm text-apple-textSec dark:text-white/60">
                这可能需要 5-10 秒钟
              </p>
            </div>
          </div>
        )}

        {/* 三个卡片横向排列 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            avgScore={getCategoryStats('celebration').avgScore}
            category="celebration"
            isHovered={hoveredCard === 'celebration'}
            items={groupedInsights.celebration}
            onHover={setHoveredCard}
            systemScores={insight.system_scores}
            trend={getCategoryStats('celebration').trend}
          />
          <InsightCard
            avgScore={getCategoryStats('warning').avgScore}
            category="warning"
            isHovered={hoveredCard === 'warning'}
            items={groupedInsights.warning}
            onHover={setHoveredCard}
            systemScores={insight.system_scores}
            trend={getCategoryStats('warning').trend}
          />
          <InsightCard
            avgScore={0}
            category="action"
            isHovered={hoveredCard === 'action'}
            items={groupedInsights.action}
            onHover={setHoveredCard}
            systemScores={insight.system_scores}
            trend="stable"
          />
        </div>

        {/* 系统评分快照 - 柱形图 */}
        <GlassCard className="p-6" title="系统评分快照">
          <SystemScoreChart systemScores={insight.system_scores} />
        </GlassCard>

        {/* AI 提供商信息 */}
        <div className="text-center text-sm text-apple-textSec dark:text-white/40">
          由 {insight.provider_used.toUpperCase()} 提供 · 分析耗时约 5-10 秒
        </div>
      </div>
    </div>
  )
}
