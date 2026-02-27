import React, { useState } from 'react';
import { Beef, Plus, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { useApp } from '~/renderer/contexts/AppContext';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { Textarea } from '~/renderer/components/ui/textarea';
import { Input } from '~/renderer/components/ui/input';

export function FuelSystemPage() {
  const { state, updateState } = useApp();
  const [newDeviation, setNewDeviation] = useState('');
  const [isEditingBaseline, setIsEditingBaseline] = useState(false);
  const [baselineInput, setBaselineInput] = useState(state.fuelSystem.baseline);

  const addDeviation = () => {
    if (!newDeviation.trim()) return;
    const deviation = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      description: newDeviation,
      type: 'other' as const,
    };

    updateState({
      fuelSystem: {
        ...state.fuelSystem,
        deviations: [deviation, ...state.fuelSystem.deviations],
      },
    });
    setNewDeviation('');
  };

  const removeDeviation = (id: string) => {
    updateState({
      fuelSystem: {
        ...state.fuelSystem,
        deviations: state.fuelSystem.deviations.filter((d) => d.id !== id),
      },
    });
  };

  const saveBaseline = () => {
    updateState({
      fuelSystem: {
        ...state.fuelSystem,
        baseline: baselineInput,
      },
    });
    setIsEditingBaseline(false);
  };

  const consistencyScore = Math.max(0, 100 - state.fuelSystem.deviations.length * 5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-apple-textMain dark:text-white flex items-center gap-3">
            <Beef className="text-orange-500" />
            饮食能量系统 (Fuel)
          </h1>
          <p className="text-apple-textSec dark:text-white/40 mt-1">
            坚持优于完美。管理您的基准饮食并记录偏离事件。
          </p>
        </div>
        <GlassCard className="!py-3 !px-5 border-orange-500/30 bg-orange-500/5">
          <div className="text-xs text-orange-500 font-bold uppercase tracking-wider">
            一致性评分
          </div>
          <div className="text-2xl font-black text-apple-textMain dark:text-white">
            {consistencyScore}%
          </div>
        </GlassCard>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <GlassCard title="每日基准 (Baseline)">
          <div className="space-y-4">
            {isEditingBaseline ? (
              <Textarea
                value={baselineInput}
                onChange={(e) => setBaselineInput(e.target.value)}
                className="min-h-[120px] bg-black/5 dark:bg-white/5 border-apple-border dark:border-white/10 focus:ring-orange-500/50"
              />
            ) : (
              <p className="text-apple-textSec dark:text-white/70 italic leading-relaxed whitespace-pre-line">
                "{state.fuelSystem.baseline}"
              </p>
            )}

            <div className="flex justify-end gap-2">
              {isEditingBaseline ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingBaseline(false)}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveBaseline}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    保存修改
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingBaseline(true)}
                >
                  修改基准
                </Button>
              )}
            </div>
          </div>
        </GlassCard>

        <GlassCard title="记录偏离事件 (Deviation)">
          <div className="space-y-4">
            <p className="text-xs text-apple-textTer dark:text-white/30">
              只需记录偏离基准的时刻（例如：深夜夜宵、跳过午餐、社交聚餐）。
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="发生了什么？"
                value={newDeviation}
                onChange={(e) => setNewDeviation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDeviation()}
                className="flex-1 bg-black/5 dark:bg-white/5 border-apple-border dark:border-white/10 focus:ring-orange-500/50"
              />
              <Button
                onClick={addDeviation}
                size="icon"
                className="bg-orange-500 hover:bg-orange-600 hover:scale-105 transition-transform"
              >
                <Plus size={20} />
              </Button>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm border border-orange-500/10">
              <AlertCircle size={18} />
              <span>记录偏离会使评分降低 5%。</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard title="近期偏离时间轴">
        <div className="space-y-4">
          {state.fuelSystem.deviations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-apple-textTer dark:text-white/20">
              <CheckCircle2 size={48} className="mb-2 opacity-50" />
              <p>目前没有偏离记录。保持得非常完美！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.fuelSystem.deviations.map((dev) => (
                <div
                  key={dev.id}
                  className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-apple-border dark:border-white/5 group hover:border-orange-500/20 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                    <div>
                      <div className="text-apple-textMain dark:text-white font-medium">
                        {dev.description}
                      </div>
                      <div className="text-xs text-apple-textTer dark:text-white/30">
                        {new Date(dev.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDeviation(dev.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
