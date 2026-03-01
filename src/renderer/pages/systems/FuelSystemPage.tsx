import React, { useState, useEffect, useRef } from 'react';
import { Beef, Plus, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { useApp } from '~/renderer/contexts/AppContext';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { Textarea } from '~/renderer/components/ui/textarea';
import { Label } from '~/renderer/components/ui/label';
import { TagInput } from '~/renderer/components/ui/tag-input';
import { useDietApi, BaselineData, Deviation } from '~/renderer/hooks/useDietApi';

const PAGE_SIZE = 10; // 每页显示10条偏离记录

export function FuelSystemPage() {
  const { state, updateState } = useApp();
  const { getBaseline, updateBaseline, createDeviation, getDeviations, deleteDeviation } = useDietApi();

  const [newDeviation, setNewDeviation] = useState('');
  const [isEditingBaseline, setIsEditingBaseline] = useState(false);
  const [baselineForm, setBaselineForm] = useState<BaselineData>({
    breakfast: [],
    lunch: [],
    dinner: [],
    taste: [],
  });

  // 偏离记录列表状态
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [displayedDeviations, setDisplayedDeviations] = useState<Deviation[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // 使用 ref 防止重复加载数据
  const isInitializedRef = useRef(false);

  // 初始化时加载数据（只执行一次）
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const loadData = async () => {
      try {
        // 加载基准数据
        const baselineData = await getBaseline();
        if (baselineData) {
          setBaselineForm(baselineData);
          // 更新全局状态（用于一致性评分计算）
          updateState({
            fuelSystem: {
              ...state.fuelSystem,
              baseline: `早餐：${baselineData.breakfast.join('、')}
午餐：${baselineData.lunch.join('、')}
晚餐：${baselineData.dinner.join('、')}
口味：${baselineData.taste.join('、')}`,
            },
          });
        }

        // 加载偏离事件列表
        const { deviations: deviationData } = await getDeviations();
        setDeviations(deviationData);
        setDisplayedDeviations(deviationData.slice(0, PAGE_SIZE));
        setHasMore(deviationData.length > PAGE_SIZE);
      } catch (error) {
        console.log('Failed to load fuel system data:', error);
      }
    };

    loadData();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  const addDeviation = async () => {
    if (!newDeviation.trim()) return;

    try {
      const newDev = await createDeviation(newDeviation);

      // 更新本地状态
      const newDeviations = [newDev, ...deviations];
      setDeviations(newDeviations);
      setDisplayedDeviations(newDeviations.slice(0, PAGE_SIZE));
      setHasMore(newDeviations.length > PAGE_SIZE);

      // 更新全局状态（用于一致性评分计算）
      updateState({
        fuelSystem: {
          ...state.fuelSystem,
          deviations: newDeviations,
        },
      });

      setNewDeviation('');
    } catch (error) {
      console.log('Failed to create deviation:', error);
    }
  };

  const removeDeviation = async (id: string) => {
    try {
      await deleteDeviation(id);

      // 更新本地状态
      const newDeviations = deviations.filter((d) => d.id !== id);
      setDeviations(newDeviations);
      setDisplayedDeviations(newDeviations.slice(0, PAGE_SIZE));
      setHasMore(newDeviations.length > PAGE_SIZE);

      // 更新全局状态（用于一致性评分计算）
      updateState({
        fuelSystem: {
          ...state.fuelSystem,
          deviations: newDeviations,
        },
      });
    } catch (error) {
      console.log('Failed to delete deviation:', error);
    }
  };

  const loadMoreDeviations = () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const currentLength = displayedDeviations.length;
    const nextDeviations = deviations.slice(currentLength, currentLength + PAGE_SIZE);

    setTimeout(() => {
      setDisplayedDeviations([...displayedDeviations, ...nextDeviations]);
      setHasMore(currentLength + PAGE_SIZE < deviations.length);
      setIsLoadingMore(false);
    }, 300);
  };

  const saveBaseline = async () => {
    try {
      const updatedBaseline = await updateBaseline(baselineForm);
      setBaselineForm(updatedBaseline);

      // 更新全局状态
      updateState({
        fuelSystem: {
          ...state.fuelSystem,
          baseline: `早餐：${updatedBaseline.breakfast.join('、')}
午餐：${updatedBaseline.lunch.join('、')}
晚餐：${updatedBaseline.dinner.join('、')}
口味：${updatedBaseline.taste.join('、')}`,
        },
      });

      setIsEditingBaseline(false);
    } catch (error) {
      console.log('Failed to update baseline:', error);
    }
  };

  const consistencyScore = Math.max(0, 100 - state.fuelSystem.deviations.length * 5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-start">
        <div>
          {/* <h1 className="text-3xl font-bold text-apple-textMain dark:text-white flex items-center gap-3">
            <Beef className="text-orange-500" />
            饮食能量系统 (Fuel)
          </h1> */}
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-apple-textMain dark:text-white">
                  早餐：
                </Label>
                <div className={`transition-all ${!isEditingBaseline ? 'opacity-60 pointer-events-none' : ''}`}>
                  <TagInput
                    value={baselineForm.breakfast || []}
                    onChange={(tags) => setBaselineForm({ ...baselineForm, breakfast: tags })}
                    placeholder="例如：燕麦片、煎蛋"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-apple-textMain dark:text-white">
                  午餐：
                </Label>
                <div className={`transition-all ${!isEditingBaseline ? 'opacity-60 pointer-events-none' : ''}`}>
                  <TagInput
                    value={baselineForm.lunch || []}
                    onChange={(tags) => setBaselineForm({ ...baselineForm, lunch: tags })}
                    placeholder="例如：沙拉、鸡胸肉"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-apple-textMain dark:text-white">
                  晚餐：
                </Label>
                <div className={`transition-all ${!isEditingBaseline ? 'opacity-60 pointer-events-none' : ''}`}>
                  <TagInput
                    value={baselineForm.dinner || []}
                    onChange={(tags) => setBaselineForm({ ...baselineForm, dinner: tags })}
                    placeholder="例如：优质蛋白、蔬菜"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-apple-textMain dark:text-white">
                  口味：
                </Label>
                <div className={`transition-all ${!isEditingBaseline ? 'opacity-60 pointer-events-none' : ''}`}>
                  <TagInput
                    value={baselineForm.taste || []}
                    onChange={(tags) => setBaselineForm({ ...baselineForm, taste: tags })}
                    placeholder="例如：清淡、少油少盐"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {isEditingBaseline ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      // 取消时重新加载数据
                      try {
                        const data = await getBaseline();
                        if (data) {
                          setBaselineForm(data);
                        }
                      } catch (error) {
                        console.log('Failed to reload baseline:', error);
                      }
                      setIsEditingBaseline(false);
                    }}
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
              <Textarea
                placeholder="例如：晚上加班太累，点了麻辣烫作为宵夜"
                value={newDeviation}
                onChange={(e) => setNewDeviation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addDeviation();
                  }
                }}
                className="flex-1 min-h-[240px] bg-black/5 dark:bg-white/5 border-apple-border dark:border-white/10 focus:ring-orange-500/50 resize-none"
              />
              <Button
                onClick={addDeviation}
                size="icon"
                className="bg-orange-500 hover:bg-orange-600 hover:scale-105 transition-transform self-end"
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
          {displayedDeviations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-apple-textTer dark:text-white/20">
              <CheckCircle2 size={48} className="mb-2 opacity-50" />
              <p>目前没有偏离记录。保持得非常完美！</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {displayedDeviations.map((dev) => (
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

              {/* 加载更多按钮 */}
              {hasMore && displayedDeviations.length > 0 && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreDeviations}
                    disabled={isLoadingMore}
                    className="w-full"
                  >
                    {isLoadingMore ? '加载中...' : '加载更多'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
