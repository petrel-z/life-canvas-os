import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, History, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '~/renderer/components/ui/button';
import { GlassCard } from '~/renderer/components/GlassCard';
import { aiApi, InsightResponse } from '~/renderer/api/ai';
import { toast } from 'sonner';
import { DIMENSIONS } from '~/renderer/lib/constants';

export function InsightDetailPage() {
  const navigate = useNavigate();
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // 加载最新洞察
  const loadLatestInsight = async () => {
    try {
      setIsLoading(true);
      const response = await aiApi.getLatestInsight();

      if (!response.ok) {
        if (response.status === 404) {
          // 没有洞察数据
          setInsight(null);
          return;
        }
        const error = await response.json();
        toast.error('加载洞察失败', {
          description: error.detail?.message || '请稍后重试',
        });
        return;
      }

      const result = await response.json();
      setInsight(result.data);
    } catch (error) {
      console.error('Failed to load insight:', error);
      toast.error('加载洞察失败', {
        description: '请稍后重试',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 生成洞察
  const handleGenerate = async (force = false) => {
    try {
      setIsGenerating(true);
      toast.loading('正在生成洞察...', {
        description: 'AI 正在分析您的数据，这可能需要几秒钟',
        id: 'generate-insight',
      });

      const response = await aiApi.generateInsight({ force });

      if (!response.ok) {
        const error = await response.json();
        toast.error('生成洞察失败', {
          id: 'generate-insight',
          description: error.detail?.message || '请稍后重试',
        });
        return;
      }

      const result = await response.json();
      setInsight(result.data);

      toast.success('洞察生成成功', {
        id: 'generate-insight',
        description: 'AI 已完成分析',
      });
    } catch (error) {
      console.error('Failed to generate insight:', error);
      toast.error('生成洞察失败', {
        id: 'generate-insight',
        description: '请稍后重试',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadLatestInsight();
  }, []);

  // 获取系统名称
  const getSystemName = (type: string) => {
    const dimension = DIMENSIONS.find((d) => d.type === type);
    return dimension?.label || type;
  };

  // 获取系统颜色
  const getSystemColor = (type: string) => {
    const dimension = DIMENSIONS.find((d) => d.type === type);
    return dimension?.color || '#6B7280';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-apple-accent" />
      </div>
    );
  }

  // 没有洞察数据
  if (!insight) {
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
                AI 智能洞察
              </h1>
              <p className="text-apple-textSec dark:text-white/40 mt-1">
                暂无洞察结果
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/insights/history')}
            className="gap-2"
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
                点击下方按钮，AI 将分析您的维度评分、日记记录等数据，为您生成个性化洞察
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className="min-w-[200px]"
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
    );
  }

  // 有洞察数据
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
              AI 智能洞察
            </h1>
            <p className="text-apple-textSec dark:text-white/40 mt-1">
              生成于 {new Date(insight.generated_at_ts).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/insights/history')}
            className="gap-2"
          >
            <History size={16} />
            历史洞察
          </Button>
          <Button
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="gap-2"
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
      <div className="space-y-6">
        {/* 洞察项列表 */}
        {insight.content.map((item, index) => (
          <GlassCard key={index} className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: `${getSystemColor(item.category)}15`,
                    color: getSystemColor(item.category),
                  }}
                >
                  {item.category}
                </div>
              </div>
              <p className="text-apple-textMain dark:text-white leading-relaxed">
                {item.insight}
              </p>
            </div>
          </GlassCard>
        ))}

        {/* 系统评分快照 */}
        <GlassCard title="系统评分快照" className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(insight.system_scores).map(([type, score]) => (
              <div
                key={type}
                className="text-center p-4 rounded-xl"
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
          由 {insight.provider_used.toUpperCase()} 提供 · 分析耗时约 5-10 秒
        </div>
      </div>
    </div>
  );
}
