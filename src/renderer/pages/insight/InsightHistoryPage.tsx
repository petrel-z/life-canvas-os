import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '~/renderer/components/ui/button'
import { GlassCard } from '~/renderer/components/GlassCard'
import { aiApi, type InsightResponse } from '~/renderer/api/ai'
import { toast } from 'sonner'
import { getSystemName } from '~/renderer/lib/insightUtils'
import { usePagination } from '~/renderer/hooks/usePagination'

export function InsightHistoryPage() {
  const navigate = useNavigate()

  // 使用分页 hook（页码切换模式）
  const {
    data: insights,
    currentPage,
    hasMore,
    isLoading,
    loadPage,
    refresh,
  } = usePagination<InsightResponse>({
    pageSize: 10,
    incremental: false, // 使用页码切换模式
    fetchData: async params => {
      const response = await aiApi.getInsights({
        page: params.page,
        page_size: params.page_size,
        sort_by: 'generated_at',
        sort_order: 'desc',
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('加载洞察历史失败', {
          description: error.detail?.message || '请稍后重试',
        })
        throw error
      }

      const result = await response.json()
      return {
        items: result.data.items,
        hasMore: params.page < result.data.total_pages,
      }
    },
  })

  const total = insights.length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 页面头部 */}
      <header className="flex items-center gap-4">
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
            历史洞察
          </h1>
          <p className="text-apple-textSec dark:text-white/40 mt-1">
            共 {total} 条洞察记录
          </p>
        </div>
      </header>

      {/* 洞察列表 */}
      {insights.length === 0 ? (
        <div className="glass-effect rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-apple-textSec dark:text-white/40 mx-auto mb-4" />
          <p className="text-apple-textSec dark:text-white/60">
            暂无历史洞察记录
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {insights.map(insight => (
              <GlassCard
                className="p-6 cursor-pointer hover:shadow-lg transition-all"
                key={insight.id}
                onClick={() =>
                  navigate('/insights/history/detail', { state: { insight } })
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-apple-textSec dark:text-white/40" />
                      <span className="text-sm text-apple-textSec dark:text-white/60">
                        {new Date(insight.generated_at_ts).toLocaleString(
                          'zh-CN'
                        )}
                      </span>
                      <div className="px-2 py-0.5 rounded text-xs font-bold bg-apple-accent/10 text-apple-accent">
                        {insight.provider_used.toUpperCase()}
                      </div>
                    </div>

                    {/* 洞察摘要（显示前3条） */}
                    <div className="space-y-2">
                      {insight.content.slice(0, 3).map((item, index) => (
                        <div className="flex items-start gap-2" key={index}>
                          <div
                            className="w-1 h-1 rounded-full mt-2 flex-shrink-0"
                            style={{
                              backgroundColor: getSystemName(item.category)
                                ? '#6B7280'
                                : '#6B7280',
                            }}
                          />
                          <div className="flex-1">
                            <div className="text-xs text-apple-textSec dark:text-white/40 uppercase mb-1">
                              {item.category}
                            </div>
                            <p className="text-sm text-apple-textMain dark:text-white line-clamp-2">
                              {item.insight}
                            </p>
                          </div>
                        </div>
                      ))}
                      {insight.content.length > 3 && (
                        <div className="text-sm text-apple-accent">
                          还有 {insight.content.length - 3} 条洞察...
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-apple-textSec dark:text-white/40 flex-shrink-0" />
                </div>
              </GlassCard>
            ))}
          </div>

          {/* 分页 */}
          {hasMore && (
            <div className="flex items-center justify-center gap-2">
              <Button
                disabled={currentPage === 1}
                onClick={() => loadPage(currentPage - 1)}
                size="sm"
                variant="outline"
              >
                上一页
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => loadPage(currentPage)}
                  size="sm"
                  variant="default"
                >
                  {currentPage}
                </Button>
                <Button
                  onClick={() => loadPage(currentPage + 1)}
                  size="sm"
                  variant="outline"
                >
                  {currentPage + 1}
                </Button>
              </div>
              <Button
                disabled={!hasMore}
                onClick={() => loadPage(currentPage + 1)}
                size="sm"
                variant="outline"
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
