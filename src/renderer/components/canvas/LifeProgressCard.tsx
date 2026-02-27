import React, { useMemo } from 'react';
import { GlassCard } from '~/renderer/components/GlassCard';
import { useApp } from '~/renderer/contexts/AppContext';
import { calculateLifeProgress } from '~/renderer/lib/lifeUtils';

export interface LifeProgressCardProps {
  className?: string;
}

export function LifeProgressCard({ className }: LifeProgressCardProps) {
  const { state } = useApp();

  // 计算生命进度
  const lifeProgress = useMemo(() => {
    return calculateLifeProgress(state.user.birthday, state.user.lifespan);
  }, [state.user.birthday, state.user.lifespan]);

  return (
    <GlassCard title="生命进度" className={`flex-1 ${className || ''}`}>
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-sm text-apple-textSec dark:text-white/60 font-medium">
            预期寿命：{state.user.lifespan} 岁
          </span>
          <span className="text-2xl font-bold text-apple-textMain dark:text-white tracking-tighter">
            {lifeProgress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-apple-bgSidebar dark:bg-white/5 h-2 rounded-full overflow-hidden border border-apple-border dark:border-none">
          <div
            className="bg-apple-accent h-full transition-all duration-1000 shadow-[0_0_12px_rgba(10,132,255,0.3)]"
            style={{ width: `${lifeProgress}%` }}
          />
        </div>
        <p className="text-xs text-apple-textTer dark:text-white/30 italic">
          "生命的画布大小，取决于你挥洒色彩的意愿。"
        </p>
      </div>
    </GlassCard>
  );
}
