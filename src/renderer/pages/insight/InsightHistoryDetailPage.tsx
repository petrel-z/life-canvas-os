import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, PartyPopper, AlertTriangle, Target } from 'lucide-react';
import { Button } from '~/renderer/components/ui/button';
import { GlassCard } from '~/renderer/components/GlassCard';
import { InsightResponse } from '~/renderer/api/ai';
import { toast } from 'sonner';
import {
  INSIGHT_CATEGORIES,
  getSystemName,
  getSystemColor,
  getInsightCategory,
  groupInsightsByCategory,
} from '~/renderer/lib/insightUtils';

// 图标映射
const ICON_MAP = {
  celebration: PartyPopper,
  warning: AlertTriangle,
  action: Target,
} as const;

export function InsightHistoryDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [insight, setInsight] = useState<InsightResponse | null>(null);

  useEffect(() => {
    // 从路由状态获取洞察数据
    const insightData = location.state?.insight as InsightResponse;

    if (!insightData) {
      toast.error('未找到洞察数据');
      navigate('/insights/history');
      return;
    }

    setInsight(insightData);
  }, [location.state, navigate]);

  if (!insight) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-apple-textSec dark:text-white/60">加载中...</div>
      </div>
    );
  }

  // 按类别分组洞察内容
  const groupedInsights = groupInsightsByCategory(insight.content);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 页面头部 */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
              洞察详情
            </h1>
            <p className="text-apple-textSec dark:text-white/40 mt-1">
              生成于 {new Date(insight.generated_at_ts).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
      </header>

      {/* 洞察内容 */}
      <div className="space-y-8">
        {/* 三个类别横向排列 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(INSIGHT_CATEGORIES).map(([key, config]) => {
            const items = groupedInsights[key as keyof typeof groupedInsights];
            const Icon = ICON_MAP[key as keyof typeof ICON_MAP];

            return (
              <div key={key} className="space-y-4">
                {/* 类别标题 */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${config.bgColor} ${config.borderColor}`}>
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`w-5 h-5 ${config.textColor}`} />
                  </div>
                  <h3 className={`text-lg font-bold ${config.textColor}`}>
                    {config.label}
                  </h3>
                  <span className={`ml-auto text-sm font-semibold ${config.textColor}`}>
                    {items.length}
                  </span>
                </div>

                {/* 洞察项列表 */}
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className={`text-center p-6 rounded-lg border border-dashed ${config.borderColor} ${config.bgColor}`}>
                      <p className={`text-sm ${config.textColor} opacity-70`}>
                        暂无{config.label}内容
                      </p>
                    </div>
                  ) : (
                    items.map((item, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border ${config.cardBg} ${config.borderColor} hover:shadow-md transition-shadow`}
                      >
                        {/* 系统标签 */}
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={{
                              backgroundColor: `${getSystemColor(item.category)}15`,
                              color: getSystemColor(item.category),
                            }}
                          >
                            {item.category}
                          </div>
                        </div>

                        {/* 洞察内容 */}
                        <p className="text-sm text-apple-textMain dark:text-white leading-relaxed">
                          {item.insight}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 系统评分快照 */}
        <GlassCard title="系统评分快照" className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(insight.system_scores).map(([type, score]) => (
              <div
                key={type}
                className="text-center p-4 rounded-xl transition-transform hover:scale-105"
                style={{ backgroundColor: `${getSystemColor(type)}10` }}
              >
                <div className="text-xs text-apple-textSec dark:text-white/60 uppercase mb-2">
                  {getSystemName(type).split(' ')[0]}
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: getSystemColor(type) }}
                >
                  {score}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* AI 提供商信息 */}
        <div className="text-center text-sm text-apple-textSec dark:text-white/40">
          由 {insight.provider_used.toUpperCase()} 提供
        </div>
      </div>
    </div>
  );
}
