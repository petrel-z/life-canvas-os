import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Plus,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Check,
  X,
  TrendingUp,
  Coffee,
  Sun,
  Moon,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { useApp } from '~/renderer/contexts/AppContext'
import { GlassCard } from '~/renderer/components/GlassCard'
import { Button } from '~/renderer/components/ui/button'
import { Textarea } from '~/renderer/components/ui/textarea'
import { Label } from '~/renderer/components/ui/label'
import { TagInput } from '~/renderer/components/ui/tag-input'
import { Input } from '~/renderer/components/ui/input'
import { Badge } from '~/renderer/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/renderer/components/ui/tabs'
import {
  useDietApi,
  type BaselineData,
  type Deviation,
} from '~/renderer/hooks/useDietApi'
import { usePagination } from '~/renderer/hooks/usePagination'
import type { MealItem, ScoreHistoryItem } from '~/renderer/api/diet'
import {
  ScoreHistoryChart,
  type ScoreHistoryDataPoint,
} from '~/renderer/components/diet/ScoreHistoryChart'
import { cn } from '~/renderer/lib/utils'

const PAGE_SIZE = 10
const MEAL_ICONS: Record<string, any> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
}

interface MealItemRowProps {
  item: MealItem
  index: number
  editable: boolean
  onUpdate: (index: number, field: 'name' | 'amount', value: string) => void
  onRemove: (index: number) => void
}

function MealItemRow({
  item,
  index,
  editable,
  onUpdate,
  onRemove,
}: MealItemRowProps) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-black/5 dark:bg-white/5 rounded-lg border border-apple-border dark:border-white/10">
      <div className="flex-1 flex items-center gap-2">
        <Input
          className="flex-1 h-8 text-sm"
          disabled={!editable}
          maxLength={20}
          onChange={e => {
            if (e.target.value.length <= 20) {
              onUpdate(index, 'name', e.target.value)
            }
          }}
          placeholder="食物名称"
          type="text"
          value={item.name || ''}
        />
        <Input
          className="w-24 h-8 text-sm"
          disabled={!editable}
          maxLength={20}
          onChange={e => {
            if (e.target.value.length <= 20) {
              onUpdate(index, 'amount', e.target.value)
            }
          }}
          placeholder="分量"
          type="text"
          value={item.amount || ''}
        />
      </div>
      {editable && (
        <Button
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
          onClick={() => onRemove(index)}
          size="icon"
          variant="ghost"
        >
          <X size={16} />
        </Button>
      )}
    </div>
  )
}

interface MealSectionProps {
  title: string
  icon: any
  items: MealItem[]
  mealType: 'breakfast' | 'lunch' | 'dinner'
  editable: boolean
  onAddItem: (mealType: 'breakfast' | 'lunch' | 'dinner') => void
  onUpdateItem: (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    index: number,
    field: 'name' | 'amount',
    value: string
  ) => void
  onRemoveItem: (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    index: number
  ) => void
}

function MealSection({
  title,
  icon: Icon,
  items,
  mealType,
  editable,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: MealSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-apple-textMain dark:text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-orange-500" />
          {title}
        </Label>
        {editable && (
          <Button
            className="h-7 text-xs"
            onClick={() => onAddItem(mealType)}
            size="sm"
            variant="ghost"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            添加
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-xs text-apple-textTer dark:text-white/30 py-4 text-center">
            暂无食物记录
          </div>
        ) : (
          items.map((item, index) => (
            <MealItemRow
              editable={editable}
              index={index}
              item={item}
              key={`${mealType}-${index}`}
              onRemove={index => onRemoveItem(mealType, index)}
              onUpdate={(index, field, value) =>
                onUpdateItem(mealType, index, field, value)
              }
            />
          ))
        )}
      </div>
    </div>
  )
}

export function FuelSystemPage() {
  const { state, updateState } = useApp()
  const {
    getBaseline,
    updateBaseline,
    createDeviation,
    getDeviations,
    updateDeviation,
    deleteDeviation,
    getDeviationsPaginated,
    getScoreHistory,
  } = useDietApi()

  const [isEditingBaseline, setIsEditingBaseline] = useState(false)
  const [baselineForm, setBaselineForm] = useState<BaselineData>({
    breakfast: [],
    lunch: [],
    dinner: [],
    taste: [],
  })

  // 评分历史状态
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryDataPoint[]>([])
  const [currentScore, setCurrentScore] = useState(100)
  const [historyDays, setHistoryDays] = useState<'7' | '30' | '90'>('30')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [hasTodayData, setHasTodayData] = useState(false)

  // 使用分页 hook 加载偏离事件
  const {
    data: displayedDeviations,
    hasMore,
    isLoadingMore,
    loadMore,
    refresh: refreshDeviations,
  } = usePagination<Deviation>({
    pageSize: PAGE_SIZE,
    incremental: true,
    fetchData: async params => {
      return await getDeviationsPaginated({
        page: params.page,
        page_size: params.page_size,
      })
    },
  })

  // 快速记录偏离
  const [quickDescription, setQuickDescription] = useState('')

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDescription, setEditingDescription] = useState('')

  const isInitializedRef = useRef(false)
  const loadScoreHistoryRef = useRef<{
    promise: Promise<any> | null
    lastDays: number | null
  }>({
    promise: null,
    lastDays: null,
  })

  // 加载评分历史
  const loadScoreHistory = useCallback(
    async (days: number) => {
      // 如果相同的请求正在进行中，直接返回之前的 promise
      if (
        loadScoreHistoryRef.current.promise &&
        loadScoreHistoryRef.current.lastDays === days
      ) {
        return loadScoreHistoryRef.current.promise
      }

      setIsLoadingHistory(true)
      const promise = (async () => {
        try {
          const { history, currentScore: scoreFromApi } =
            await getScoreHistory(days)

          // 使用接口返回的 current_score
          setCurrentScore(scoreFromApi)

          // 按时间正序排列数据（从旧到新）
          const sortedHistory = [...history].sort(
            (a, b) => a.timestamp - b.timestamp
          )

          // 按天汇总数据，取每天的最后一个记录（最终分数）
          const dailyMap = new Map<string, (typeof history)[0]>()
          sortedHistory.forEach(item => {
            const dateKey = new Date(item.timestamp).toLocaleDateString('zh-CN')
            // 同一天的多条记录，只保留最后一条（分数最低的）
            dailyMap.set(dateKey, item)
          })

          // 转换为图表数据格式
          const chartData: ScoreHistoryDataPoint[] = Array.from(
            dailyMap.values()
          ).map(item => ({
            date: new Date(item.timestamp).toLocaleDateString('zh-CN'),
            score: item.new_score,
            timestamp: item.timestamp,
          }))

          setScoreHistory(chartData)

          // 检查今天是否已有数据
          const today = new Date().toLocaleDateString('zh-CN')
          const hasDataToday = chartData.some(item => item.date === today)
          setHasTodayData(hasDataToday)
        } catch (error) {
          console.log('Failed to load score history:', error)
        } finally {
          setIsLoadingHistory(false)
          loadScoreHistoryRef.current.promise = null
          loadScoreHistoryRef.current.lastDays = null
        }
      })()

      loadScoreHistoryRef.current.promise = promise
      loadScoreHistoryRef.current.lastDays = days
      return promise
    },
    [getScoreHistory]
  )

  // 初始化加载数据
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const loadData = async () => {
      try {
        // 加载基准数据
        const baselineData = await getBaseline()
        if (baselineData) {
          setBaselineForm(baselineData)
          const formatMealItems = (items: MealItem[]) => {
            return items.map(item => `${item.name}(${item.amount})`).join('、')
          }
          updateState({
            fuelSystem: {
              ...state.fuelSystem,
              baseline: `早餐：${formatMealItems(baselineData.breakfast)}
午餐：${formatMealItems(baselineData.lunch)}
晚餐：${formatMealItems(baselineData.dinner)}
口味：${baselineData.taste.join('、')}`,
            },
          })
        }

        // 偏离事件由 usePagination hook 自动加载
        // 评分历史由第二个 useEffect 加载（避免重复调用）
      } catch (error) {
        console.log('Failed to load fuel system data:', error)
      }
    }

    loadData()
  }, [])

  // 切换历史天数时重新加载（包括首次加载）
  useEffect(() => {
    const days = parseInt(historyDays, 10)
    loadScoreHistory(days)
  }, [historyDays, loadScoreHistory])

  // 使用已加载的偏离事件数量计算一致性评分
  const consistencyScore = Math.max(0, 100 - displayedDeviations.length * 5)

  const addMealItem = (mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setBaselineForm({
      ...baselineForm,
      [mealType]: [...baselineForm[mealType], { name: '', amount: '' }],
    })
  }

  const updateMealItem = (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    index: number,
    field: 'name' | 'amount',
    value: string
  ) => {
    const newItems = [...baselineForm[mealType]]
    newItems[index] = { ...newItems[index], [field]: value }
    setBaselineForm({
      ...baselineForm,
      [mealType]: newItems,
    })
  }

  const removeMealItem = (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    index: number
  ) => {
    setBaselineForm({
      ...baselineForm,
      [mealType]: baselineForm[mealType].filter((_, i) => i !== index),
    })
  }

  const saveBaseline = async () => {
    try {
      const updatedBaseline = await updateBaseline(baselineForm)
      setBaselineForm(updatedBaseline)
      const formatMealItems = (items: MealItem[]) => {
        return items.map(item => `${item.name}(${item.amount})`).join('、')
      }
      updateState({
        fuelSystem: {
          ...state.fuelSystem,
          baseline: `早餐：${formatMealItems(updatedBaseline.breakfast)}
午餐：${formatMealItems(updatedBaseline.lunch)}
晚餐：${formatMealItems(updatedBaseline.dinner)}
口味：${updatedBaseline.taste.join('、')}`,
        },
      })
      setIsEditingBaseline(false)
    } catch (error) {
      console.log('Failed to update baseline:', error)
    }
  }

  const addQuickDeviation = async () => {
    if (!quickDescription.trim()) {
      return
    }

    try {
      const newDev = await createDeviation(quickDescription.trim())
      // 刷新偏离事件列表
      refreshDeviations()
      setQuickDescription('')
      // 重新加载评分历史
      loadScoreHistory(parseInt(historyDays, 10))
    } catch (error) {
      console.log('Failed to create deviation:', error)
    }
  }

  const removeDeviation = async (id: string) => {
    try {
      await deleteDeviation(id)
      // 刷新偏离事件列表
      refreshDeviations()
      // 重新加载评分历史
      loadScoreHistory(parseInt(historyDays, 10))
    } catch (error) {
      console.log('Failed to delete deviation:', error)
    }
  }

  const startEdit = (deviation: Deviation) => {
    setEditingId(deviation.id)
    setEditingDescription(deviation.description)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDescription('')
  }

  const saveEdit = async (id: string) => {
    if (!editingDescription.trim()) return
    try {
      await updateDeviation(id, editingDescription)
      cancelEdit()
      // 刷新偏离事件列表
      refreshDeviations()
    } catch (error) {
      console.log('Failed to update deviation:', error)
    }
  }

  // 按日期分组偏离事件
  const groupedDeviations = useMemo(() => {
    const groups: Record<string, Deviation[]> = {}
    displayedDeviations.forEach(dev => {
      const date = new Date(dev.timestamp).toLocaleDateString('zh-CN')
      if (!groups[date]) groups[date] = []
      groups[date].push(dev)
    })
    return groups
  }, [displayedDeviations])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 头部 - 标题和评分 */}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-apple-textMain dark:text-white flex items-center gap-3">
            <Sparkles className="text-orange-500" />
            饮食系统
          </h1>
          <p className="text-apple-textSec dark:text-white/40 mt-1 text-sm">
            坚持优于完美。记录您的基准饮食，追踪偏离时刻。
          </p>
        </div>
        <GlassCard className="!py-4 !px-6 border-orange-500/30 bg-orange-500/5 min-w-[140px]">
          <div className="text-xs text-orange-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            一致性评分
          </div>
          <div className="text-3xl font-black text-apple-textMain dark:text-white mt-1">
            {currentScore}
          </div>
        </GlassCard>
      </header>

      {/* 评分历史图表 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-apple-textMain dark:text-white">
                评分趋势
              </div>
              <div className="text-xs text-apple-textTer dark:text-white/30">
                最近{historyDays}天的变化
              </div>
            </div>
          </div>
          <Tabs
            className="w-auto"
            onValueChange={v => setHistoryDays(v as any)}
            value={historyDays}
          >
            <TabsList className="h-8">
              <TabsTrigger className="text-xs h-7" value="7">
                7 天
              </TabsTrigger>
              <TabsTrigger className="text-xs h-7" value="30">
                30 天
              </TabsTrigger>
              <TabsTrigger className="text-xs h-7" value="90">
                90 天
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScoreHistoryChart
          currentScore={currentScore}
          data={scoreHistory}
          hasTodayData={hasTodayData}
          isLoading={isLoadingHistory}
        />
      </GlassCard>

      {/* 主体内容 - 左右两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左列 - 基准饮食 + 快速记录偏离 */}
        <div className="space-y-6">
          {/* 基准饮食 */}
          <GlassCard title="基准饮食">
            <div className="space-y-4">
              <MealSection
                editable={isEditingBaseline}
                icon={Coffee}
                items={baselineForm.breakfast}
                mealType="breakfast"
                onAddItem={addMealItem}
                onRemoveItem={removeMealItem}
                onUpdateItem={updateMealItem}
                title="早餐"
              />
              <MealSection
                editable={isEditingBaseline}
                icon={Sun}
                items={baselineForm.lunch}
                mealType="lunch"
                onAddItem={addMealItem}
                onRemoveItem={removeMealItem}
                onUpdateItem={updateMealItem}
                title="午餐"
              />
              <MealSection
                editable={isEditingBaseline}
                icon={Moon}
                items={baselineForm.dinner}
                mealType="dinner"
                onAddItem={addMealItem}
                onRemoveItem={removeMealItem}
                onUpdateItem={updateMealItem}
                title="晚餐"
              />
              <div className="space-y-2 pt-2 border-t border-apple-border dark:border-white/5">
                <Label className="text-sm font-semibold text-apple-textMain dark:text-white">
                  口味偏好
                </Label>
                {isEditingBaseline ? (
                  <TagInput
                    onChange={tags =>
                      setBaselineForm({ ...baselineForm, taste: tags })
                    }
                    placeholder="添加口味标签"
                    tagClassName="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10"
                    value={baselineForm.taste}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {baselineForm.taste.length === 0 ? (
                      <span className="text-xs text-apple-textTer dark:text-white/30">
                        未设置
                      </span>
                    ) : (
                      baselineForm.taste.map((taste, i) => (
                        <Badge
                          className="text-xs px-2.5 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10"
                          key={i}
                          variant="secondary"
                        >
                          {taste}
                        </Badge>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-apple-border dark:border-white/5">
              {isEditingBaseline ? (
                <>
                  <Button
                    onClick={() => {
                      getBaseline().then(data => {
                        if (data) setBaselineForm(data)
                      })
                      setIsEditingBaseline(false)
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    取消
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={saveBaseline}
                    size="sm"
                  >
                    保存基准
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditingBaseline(true)}
                  size="sm"
                  variant="outline"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  编辑基准
                </Button>
              )}
            </div>
          </GlassCard>

          {/* 快速记录偏离 */}
          <GlassCard title="快速记录偏离">
            <div className="space-y-4">
              {/* 描述输入 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-apple-textSec dark:text-white/40">
                    具体情况
                  </Label>
                  <span className="text-xs text-apple-textTer dark:text-white/30">
                    {quickDescription.length} / 500
                  </span>
                </div>
                <Textarea
                  className="min-h-[100px] bg-black/5 dark:bg-white/5 border-apple-border dark:border-white/10 resize-none"
                  maxLength={500}
                  onChange={e => {
                    if (e.target.value.length <= 500) {
                      setQuickDescription(e.target.value)
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      addQuickDeviation()
                    }
                  }}
                  placeholder="例如：加班太累，点了麻辣烫作为宵夜..."
                  value={quickDescription}
                />
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={addQuickDeviation}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                记录偏离
              </Button>

              {/* 提示信息 */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs">
                <AlertCircle size={16} />
                <span>每次记录会使一致性评分降低 5 分</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* 右列 - 本周统计 + 偏离事件时间轴 */}
        <div className="space-y-6">
          {/* 本周统计 */}
          <GlassCard>
            <div className="text-xs text-apple-textSec dark:text-white/40 font-semibold uppercase tracking-wider mb-4">
              本周统计
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-apple-textTer dark:text-white/60">
                  偏离次数
                </span>
                <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10">
                  {
                    displayedDeviations.filter(
                      d => d.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
                    ).length
                  }{' '}
                  次
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-apple-textTer dark:text-white/60">
                  当前评分
                </span>
                <span
                  className={cn(
                    'text-sm font-bold',
                    currentScore >= 80
                      ? 'text-green-500'
                      : currentScore >= 60
                        ? 'text-orange-500'
                        : 'text-red-500'
                  )}
                >
                  {currentScore}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* 偏离事件时间轴 - 带滚动条 */}
          <GlassCard className="flex flex-col" title="偏离事件时间轴">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[600px]">
              {displayedDeviations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-apple-textTer dark:text-white/20">
                  <CheckCircle2 className="mb-3 opacity-50" size={48} />
                  <p className="text-sm">目前没有偏离记录</p>
                  <p className="text-xs mt-1">继续保持完美的饮食记录！</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedDeviations).map(([date, devs]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-3 sticky top-0 bg-apple-bgMain dark:bg-black py-2 z-10">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-semibold text-apple-textSec dark:text-white/40 uppercase tracking-wider">
                          {date}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {devs.map(dev => (
                          <div
                            className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-apple-border dark:border-white/5 group hover:border-orange-500/20 transition-all"
                            key={dev.id}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                              <div className="flex-1">
                                {editingId === dev.id ? (
                                  <div className="space-y-1">
                                    <div className="flex justify-end">
                                      <span className="text-xs text-apple-textTer dark:text-white/30">
                                        {editingDescription.length} / 500
                                      </span>
                                    </div>
                                    <Textarea
                                      autoFocus
                                      className="min-h-[60px] bg-black/5 dark:bg-white/5 border-apple-border dark:border-white/10 focus:ring-orange-500/50 resize-none"
                                      maxLength={500}
                                      onChange={e => {
                                        if (e.target.value.length <= 500) {
                                          setEditingDescription(e.target.value)
                                        }
                                      }}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault()
                                          saveEdit(dev.id)
                                        } else if (e.key === 'Escape') {
                                          cancelEdit()
                                        }
                                      }}
                                      value={editingDescription}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm text-apple-textMain dark:text-white">
                                      {dev.description}
                                    </div>
                                    <div className="text-xs text-apple-textTer dark:text-white/30 mt-0.5">
                                      {new Date(dev.timestamp).toLocaleString(
                                        'zh-CN'
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {editingId === dev.id ? (
                                <>
                                  <Button
                                    className="opacity-100 hover:bg-green-500/10 hover:text-green-600"
                                    onClick={() => saveEdit(dev.id)}
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <Check size={16} />
                                  </Button>
                                  <Button
                                    className="opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={cancelEdit}
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <X size={16} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    className="opacity-0 group-hover:opacity-100 hover:bg-blue-500/10 hover:text-blue-600"
                                    onClick={() => startEdit(dev)}
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <Edit size={16} />
                                  </Button>
                                  <Button
                                    className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => removeDeviation(dev.id)}
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-4 border-t border-apple-border dark:border-white/5">
                <Button
                  className="w-full"
                  disabled={isLoadingMore}
                  onClick={loadMore}
                  size="sm"
                  variant="outline"
                >
                  {isLoadingMore ? '加载中...' : '加载更多'}
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
