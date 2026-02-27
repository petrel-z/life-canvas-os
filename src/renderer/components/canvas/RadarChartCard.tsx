import React, { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '~/renderer/contexts/AppContext';
import { DIMENSIONS } from '~/renderer/lib/constants';
import { GlassCard } from '~/renderer/components/GlassCard';

export interface RadarChartCardProps {
  className?: string;
}

export function RadarChartCard({ className }: RadarChartCardProps) {
  const { state } = useApp();

  // 准备雷达图数据
  const chartData = useMemo(() => {
    return DIMENSIONS.map((d) => ({
      subject: d.label.split(' ')[0],
      value: state.dimensions[d.type] || 0,
      fullMark: 100,
    }));
  }, [state.dimensions]);

  // 检测当前是否为深色模式
  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <GlassCard className={`lg:col-span-2 min-h-[450px] relative overflow-hidden ${className || ''}`} title="八维生命平衡模型">
      <div className="absolute inset-x-6 top-14 bottom-6">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : '#EFEFF4'} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{
                fill: isDarkMode ? 'rgba(255,255,255,0.5)' : '#86868B',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="生命评分"
              dataKey="value"
              stroke="#0A84FF"
              strokeWidth={2}
              fill="#0A84FF"
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
