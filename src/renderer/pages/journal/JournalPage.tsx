import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Calendar,
  Plus,
  Lock,
  EyeOff,
  LockKeyhole,
} from 'lucide-react'
import { useApp } from '~/renderer/contexts/AppContext'
import { GlassCard } from '~/renderer/components/GlassCard'
import { Button } from '~/renderer/components/ui/button'
import { Badge } from '~/renderer/components/ui/badge'
import { Switch } from '~/renderer/components/ui/switch'
import { MoodSelector } from '~/renderer/components/ui/mood-selector'
import { SearchInput } from '~/renderer/components/ui/search-input'
import { MOODS, type MoodType } from '~/renderer/lib/constants'
import {
  formatDateCN,
  formatTimeCN,
  formatWeekdayCN,
} from '~/renderer/lib/dateUtils'
import { groupByDate } from '~/renderer/lib/arrayUtils'
import type { DimensionType, JournalEntry } from '~/shared/types'
import { useJournalApi } from '~/renderer/hooks/useJournalApi'

const PAGE_SIZE = 10

export function JournalPage() {
  const { state, updateState } = useApp()
  const { listJournals, createJournal } = useJournalApi()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<MoodType>('good')
  const [search, setSearch] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)

  // 使用 ref 避免重复调用
  const isLoadingRef = useRef(false)

  // 加载日记列表（首次加载）
  useEffect(() => {
    const loadJournals = async () => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true

      try {
        setIsLoading(true)
        const result = await listJournals({ page: 1, page_size: PAGE_SIZE })
        setJournals(result.items)
        setHasNext(result.has_next)
        setCurrentPage(1)
      } catch (error) {
        console.error('Failed to load journals:', error)
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }

    loadJournals()
  }, []) // 空依赖数组，只在组件挂载时执行一次

  // 加载更多
  const loadMore = async () => {
    if (isLoadingMore || !hasNext) return

    try {
      setIsLoadingMore(true)
      const nextPage = currentPage + 1
      const result = await listJournals({
        page: nextPage,
        page_size: PAGE_SIZE,
      })
      setJournals(prev => [...prev, ...result.items])
      setHasNext(result.has_next)
      setCurrentPage(nextPage)
    } catch (error) {
      console.error('Failed to load more journals:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const addEntry = async () => {
    if (!content.trim() || isSaving) return

    setIsSaving(true)

    try {
      const entry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: '新建日记',
        content,
        mood,
        tags: [] as string[],
        attachments: [] as string[],
        linkedDimensions: [] as DimensionType[],
        isPrivate,
      }

      const created = await createJournal(entry)
      setJournals(prev => [created, ...prev])
      setContent('')
      setMood('good')
      setIsPrivate(false)
    } catch (error) {
      console.error('Failed to create journal:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredJournals = journals.filter(j =>
    j.content.toLowerCase().includes(search.toLowerCase())
  )

  // 按日期分组
  const groupedJournals = groupByDate(filteredJournals, formatDateCN)

  // 计算情绪分布
  const moodDistribution = journals.reduce(
    (acc, j) => {
      acc[j.mood] = (acc[j.mood] || 0) + 1
      return acc
    },
    {} as Record<MoodType, number>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-apple-textSec dark:text-white/40">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-start">
        <div>
          {/* <h1 className="text-3xl font-bold text-apple-textMain dark:text-white flex items-center gap-3">
            <Sparkles className="text-purple-500" />
            生活日记
          </h1> */}
          <p className="text-apple-textSec dark:text-white/40 mt-1">
            记录您的旅程，捕捉您的情绪，在反思中不断成长。
          </p>
        </div>
        <Link to="/journal/new">
          <Button className="bg-purple-500 hover:bg-purple-600">
            <Plus className="mr-2" size={20} />
            新建日记
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard title="快速记录">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <MoodSelector onChange={setMood} value={mood} variant="icon" />
                <div className="text-xs text-apple-textTer dark:text-white/30 font-medium">
                  {formatWeekdayCN(Date.now())}
                </div>
              </div>

              <textarea
                className="w-full h-40 bg-black/5 dark:bg-white/5 border border-apple-border dark:border-white/10 rounded-2xl p-5 text-apple-textMain dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-base leading-relaxed shadow-inner"
                onChange={e => setContent(e.target.value)}
                placeholder="现在在想什么？今天过得怎么样？"
                value={content}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPrivate ? (
                    <Lock className="text-purple-500" size={16} />
                  ) : (
                    <EyeOff
                      className="text-apple-textTer dark:text-white/20"
                      size={16}
                    />
                  )}
                  <span className="text-xs text-apple-textSec dark:text-white/40">
                    私密日记
                  </span>
                  <Switch
                    checked={isPrivate}
                    className="data-[state=checked]:bg-purple-500"
                    onCheckedChange={setIsPrivate}
                  />
                </div>

                <Button
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
                  disabled={!content.trim() || isSaving}
                  onClick={addEntry}
                >
                  {isSaving ? '保存中...' : '保存日记'}
                </Button>
              </div>
            </div>
          </GlassCard>

          <div className="space-y-6">
            {Object.entries(groupedJournals).map(([date, journals]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-apple-textTer dark:text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Calendar size={16} />
                  {date}
                </h3>
                <div className="space-y-3">
                  {journals.map(j => {
                    const moodObj = MOODS.find(m => m.type === j.mood)
                    const MoodIcon = moodObj?.icon

                    return (
                      <GlassCard
                        className="group border-apple-border dark:border-white/5 hover:border-purple-500/20 cursor-pointer"
                        key={j.id}
                      >
                        <Link
                          className="block"
                          state={{ isPrivate: j.isPrivate }}
                          to={`/journal/${j.id}`}
                        >
                          <div className="flex gap-5">
                            <div className="flex flex-col items-center gap-2 pt-1">
                              {MoodIcon && (
                                <MoodIcon
                                  className={moodObj?.color}
                                  size={24}
                                />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-bold text-apple-textTer dark:text-white/20 uppercase tracking-widest">
                                    {formatTimeCN(j.timestamp)}
                                  </div>
                                  {j.isPrivate && (
                                    <LockKeyhole
                                      className="text-purple-500"
                                      size={14}
                                    />
                                  )}
                                </div>
                                {j.tags && j.tags.length > 0 && (
                                  <div className="flex gap-1">
                                    {j.tags.slice(0, 2).map(tag => (
                                      <Badge
                                        className="text-xs"
                                        key={tag}
                                        variant="secondary"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-apple-textMain dark:text-white line-clamp-1">
                                  {j.title || '新建日记'}
                                </h4>
                                {j.isPrivate ? (
                                  <p className="text-xs text-apple-textTer dark:text-white/30 italic leading-relaxed">
                                    {/* 此日记为私密日记，需要 PIN 码才能查看 */}
                                  </p>
                                ) : (
                                  <p className="text-xs text-apple-textSec dark:text-white/60 leading-relaxed line-clamp-2">
                                    {j.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </GlassCard>
                    )
                  })}
                </div>
              </div>
            ))}

            {filteredJournals.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-apple-textTer dark:text-white/20">
                <Sparkles className="mb-3 opacity-50" size={48} />
                <p className="text-lg">开始记录您的第一篇日记吧</p>
              </div>
            )}

            {hasNext && filteredJournals.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  className="min-w-[120px]"
                  disabled={isLoadingMore}
                  onClick={loadMore}
                  variant="outline"
                >
                  {isLoadingMore ? '加载中...' : '加载更多'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <GlassCard title="搜索">
            <SearchInput
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索回忆..."
              value={search}
            />
          </GlassCard>

          <GlassCard title="数据统计">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-apple-textSec dark:text-white/40">
                  日记总数
                </span>
                <span className="text-apple-textMain dark:text-white font-bold">
                  {journals.length}
                </span>
              </div>

              <div className="pt-4 border-t border-apple-border dark:border-white/5">
                <div className="text-xs text-apple-textTer dark:text-white/20 uppercase font-bold mb-3 tracking-widest">
                  情绪分布
                </div>
                <div className="space-y-2">
                  {MOODS.map(m => {
                    const count = moodDistribution[m.type] || 0
                    const percentage = journals.length
                      ? Math.round((count / journals.length) * 100)
                      : 0
                    return (
                      <div
                        className="flex items-center gap-2 text-xs"
                        key={m.type}
                      >
                        <m.icon className={m.color} size={16} />
                        <div className="flex-1 h-2 bg-apple-bg2 dark:bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${m.color.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-apple-textTer dark:text-white/30 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
