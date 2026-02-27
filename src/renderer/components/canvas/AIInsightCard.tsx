import React from 'react';
import { Activity } from 'lucide-react';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';

export interface AIInsightCardProps {
  className?: string;
}

export function AIInsightCard({ className }: AIInsightCardProps) {
  // TODO: 后续从 AI 洞察 API 获取数据
  const insight = {
    primaryImprovement: '身体健康',
    description: '您的产出评分很高，但恢复系统严重滞后。建议在晚上 9 点到 11 点之间安排"无电子设备"时间。',
  };

  return (
    <GlassCard title="AI 智能洞察" className={`flex-1 ${className || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-apple-accent/10 text-apple-accent">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-sm text-apple-textSec dark:text-white/40 font-bold uppercase tracking-wider">
              首要改进
            </div>
            <div className="text-lg font-bold text-apple-textMain dark:text-white">
              {insight.primaryImprovement}
            </div>
          </div>
        </div>
        <p className="text-sm text-apple-textSec dark:text-white/60 leading-relaxed">
          {insight.description}
        </p>
        <Button className="w-full" size="default">
          查看详细报告
        </Button>
      </div>
    </GlassCard>
  );
}
