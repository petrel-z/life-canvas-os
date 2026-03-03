import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { Beef, Sparkles, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { GlassCard } from '~/renderer/components/GlassCard'
import { Badge } from '~/renderer/components/ui/badge'
import {
  useTimelineApi,
  type TimelineDateGroup,
  type TimelineEventItem,
} from '~/renderer/hooks/useTimelineApi'

type TimelineEvent = {
  id: string
  timestamp: number
  type: 'journal' | 'fuel' | 'dimension'
  title: string
  content: string
  icon: React.ReactNode
  color: string
  time: string
}

export function TimelinePage() {
  const { getTimeline } = useTimelineApi()
  const [filter, setFilter] = useState<'all' | 'journal' | 'fuel'>('all')
  const [allTimelineData, setAllTimelineData] = useState<TimelineDateGroup[]>(
    []
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const isLoadingRef = useRef(false)

  // 加载时间轴数据
  const loadTimeline = async (
    typeFilter?: 'all' | 'journal' | 'fuel',
    page: number = 1
  ) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    if (page === 1) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      // 转换前端的 filter 到后端的 type
      const apiType =
        typeFilter === 'journal'
          ? 'diary'
          : typeFilter === 'fuel'
            ? 'diet'
            : 'all'
      const { timeline, hasMore: moreData } = await getTimeline({
        type: apiType,
        page,
        page_size: 10,
      })

      if (page === 1) {
        // 首次加载，直接替换
        setAllTimelineData(timeline)
        setCurrentPage(1)
      } else {
        // 追加数据
        setAllTimelineData(prev => [...prev, ...timeline])
        setCurrentPage(page)
      }

      setHasMore(moreData)
    } catch (error) {
      console.log('Failed to load timeline:', error)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  // 加载更多
  const loadMore = () => {
    if (isLoadingMore || !hasMore) return
    loadTimeline(filter, currentPage + 1)
  }

  // 初始化时加载数据
  useEffect(() => {
    loadTimeline(filter)
  }, [])

  // 当 filter 改变时重新加载数据
  useEffect(() => {
    loadTimeline(filter)
  }, [filter])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          {/* <h1 className="text-4xl font-black text-apple-textMain dark:text-white tracking-tight flex items-center gap-3">
            <History className="text-blue-500" />
            时间轴
          </h1> */}
          <p className="text-apple-textSec dark:text-white/40 mt-1 text-lg">
            跨系统的生命足迹聚合审计。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-apple-bg2 dark:bg-white/5 p-1 rounded-xl border border-apple-border dark:border-white/10 backdrop-blur-md">
            {[
              { value: 'all' as const, label: '全部', color: 'blue' },
              { value: 'journal' as const, label: '日记', color: 'purple' },
              { value: 'fuel' as const, label: '饮食', color: 'orange' },
            ].map(f => {
              // 选中状态的样式
              const selectedBg =
                f.color === 'blue'
                  ? 'bg-white dark:bg-blue-600'
                  : f.color === 'purple'
                    ? 'bg-white dark:bg-purple-600'
                    : 'bg-white dark:bg-orange-600'

              const selectedText =
                f.color === 'blue'
                  ? 'text-blue-600 dark:text-white'
                  : f.color === 'purple'
                    ? 'text-purple-600 dark:text-white'
                    : 'text-orange-600 dark:text-white'

              return (
                <button
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    filter === f.value
                      ? `${selectedBg} ${selectedText} shadow-sm`
                      : 'text-apple-textSec dark:text-white/40 hover:text-apple-textMain dark:hover:text-white'
                  }`}
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <div className="relative">
        <div className="absolute left-[21px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-apple-border dark:via-white/10 to-transparent" />

        <div className="space-y-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-apple-textTer dark:text-white/10">
              <Clock className="mb-4 opacity-50 animate-pulse" size={64} />
              <p className="text-xl font-bold">加载中...</p>
            </div>
          ) : allTimelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-apple-textTer dark:text-white/10">
              <Clock className="mb-4 opacity-50" size={64} />
              <p className="text-xl font-bold">暂无足迹记录</p>
              <p className="text-sm">您的所有行为和日记都将在这里汇聚。</p>
            </div>
          ) : (
            <>
              {allTimelineData.map(group => (
                <div className="space-y-6 relative" key={group.date}>
                  <div className="flex items-center gap-4 sticky top-0 z-10 py-2">
                    <div className="w-[43px] h-[43px] rounded-full bg-apple-bgMain dark:bg-[#050505] border border-apple-border dark:border-white/10 flex items-center justify-center shadow-md">
                      <CalendarIcon className="text-blue-500" size={18} />
                    </div>
                    <h3 className="text-lg font-black text-apple-textMain dark:text-white tracking-tight backdrop-blur-md bg-white/60 dark:bg-[#050505]/80 px-4 py-1 rounded-full border border-apple-border dark:border-white/5">
                      {group.date}
                    </h3>
                  </div>

                  <div className="ml-[43px] space-y-6 pl-8">
                    {group.events.map((event: TimelineEventItem) => {
                      const type = event.type === 'diary' ? 'journal' : 'fuel'
                      const icon =
                        type === 'journal' ? (
                          <Sparkles size={16} />
                        ) : (
                          <Beef size={16} />
                        )
                      const color =
                        type === 'journal'
                          ? 'text-purple-500'
                          : 'text-orange-500'
                      const title = type === 'journal' ? '日记记录' : '饮食偏离'

                      return (
                        <div className="relative group" key={event.id}>
                          <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-px bg-apple-border dark:bg-white/10 group-hover:bg-blue-500/30 transition-colors" />

                          <GlassCard className="!p-5 hover:translate-x-1 transition-transform border-apple-border dark:border-white/5 hover:border-blue-500/20 dark:hover:border-white/20 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div
                                className={`p-2 rounded-lg bg-black/5 dark:bg-white/5 ${color} border border-apple-border dark:border-white/5`}
                              >
                                {icon}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-center">
                                  <Badge
                                    className="text-[10px] uppercase tracking-wider"
                                    variant="secondary"
                                  >
                                    {title}
                                  </Badge>
                                  <span className="text-[10px] text-apple-textTer dark:text-white/20 font-mono">
                                    {event.time}
                                  </span>
                                </div>
                                <p className="text-apple-textSec dark:text-white/80 text-sm leading-relaxed line-clamp-3">
                                  {event.content}
                                </p>
                              </div>
                            </div>
                          </GlassCard>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* 加载更多按钮 */}
              {hasMore && (
                <div className="flex justify-center pt-8">
                  <button
                    className="px-8 py-3 bg-apple-bg2 dark:bg-white/5 border border-apple-border dark:border-white/10 rounded-full text-sm font-bold text-apple-textMain dark:text-white hover:bg-apple-bg3 dark:hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    disabled={isLoadingMore}
                    onClick={loadMore}
                  >
                    {isLoadingMore ? '加载中...' : '加载更多'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <div className="flex items-center gap-2 px-6 py-3 bg-apple-bg2 dark:bg-white/5 border border-apple-border dark:border-white/5 rounded-full text-[10px] font-black text-apple-textTer dark:text-white/20 tracking-[0.3em] uppercase">
          End of Life Stream • Keep Growing
        </div>
      </div>
    </div>
  )
}
