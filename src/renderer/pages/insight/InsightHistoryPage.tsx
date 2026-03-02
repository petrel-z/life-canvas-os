import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '~/renderer/components/ui/button';
import { GlassCard } from '~/renderer/components/GlassCard';
import { aiApi, InsightResponse } from '~/renderer/api/ai';
import { toast } from 'sonner';
import { DIMENSIONS } from '~/renderer/lib/constants';

export function InsightHistoryPage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<InsightResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // 加载洞察列表
  const loadInsights = async (page: number) => {
    try {
      setIsLoading(true);
      const response = await aiApi.getInsights({
        page,
        page_size: pageSize,
        sort_by: 'generated_at',
        sort_order: 'desc',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error('加载洞察历史失败', {
          description: error.detail?.message || '请稍后重试',
        });
        return;
      }

      const result = await response.json();
      setInsights(result.data.items);
      setTotalPages(result.data.total_pages);
      setTotal(result.data.total);
    } catch (error) {
      console.error('Failed to load insights:', error);
      toast.error('加载洞察历史失败', {
        description: '请稍后重试',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 切换页面
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    loadInsights(page);
  };

  useEffect(() => {
    loadInsights(currentPage);
  }, [currentPage]);

  // 获取系统名称
  const getSystemName = (type: string) => {
    const dimension = DIMENSIONS.find((d) => d.type === type);
    return dimension?.label || type;
  };

  if (isLoading && insights.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-apple-textSec dark:text-white/60">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 页面头部 */}
      <header className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
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
          <p className="text-apple-textSec dark:text-white/60">暂无历史洞察记录</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {insights.map((insight) => (
              <GlassCard
                key={insight.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => navigate(`/insights/${insight.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-apple-textSec dark:text-white/40" />
                      <span className="text-sm text-apple-textSec dark:text-white/60">
                        {new Date(insight.generated_at_ts).toLocaleString('zh-CN')}
                      </span>
                      <div className="px-2 py-0.5 rounded text-xs font-bold bg-apple-accent/10 text-apple-accent">
                        {insight.provider_used.toUpperCase()}
                      </div>
                    </div>

                    {/* 洞察摘要（显示前3条） */}
                    <div className="space-y-2">
                      {insight.content.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div
                            className="w-1 h-1 rounded-full mt-2 flex-shrink-0"
                            style={{ backgroundColor: getSystemName(item.category) ? '#6B7280' : '#6B7280' }}
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
