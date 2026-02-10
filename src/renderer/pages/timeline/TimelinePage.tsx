import React, { useMemo, useState } from "react";
import {
  History,
  Beef,
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  Search,
} from "lucide-react";
import { useApp } from "~/renderer/contexts/AppContext";
import { GlassCard } from "~/renderer/components/GlassCard";
import { Input } from "~/renderer/components/ui/input";
import { Badge } from "~/renderer/components/ui/badge";
import { formatDateCN } from "~/renderer/lib/dateUtils";

type TimelineEvent = {
  id: string;
  timestamp: number;
  type: "journal" | "fuel" | "dimension";
  title: string;
  content: string;
  icon: React.ReactNode;
  color: string;
};

export function TimelinePage() {
  const { state } = useApp();
  const [filter, setFilter] = useState<"all" | "journal" | "fuel">("all");
  const [search, setSearch] = useState("");

  const events = useMemo(() => {
    const journalEvents: TimelineEvent[] = state.journals.map((j) => ({
      id: j.id,
      timestamp: j.timestamp,
      type: "journal" as const,
      title: "日记记录",
      content: j.content,
      icon: <Sparkles size={16} />,
      color: "text-purple-500",
    }));

    const fuelEvents: TimelineEvent[] = state.fuelSystem.deviations.map(
      (d) => ({
        id: d.id,
        timestamp: d.timestamp,
        type: "fuel" as const,
        title: "饮食偏离",
        content: d.description,
        icon: <Beef size={16} />,
        color: "text-orange-500",
      }),
    );

    return [...journalEvents, ...fuelEvents]
      .filter((e) => {
        const matchesFilter = filter === "all" || e.type === filter;
        const matchesSearch =
          !search ||
          e.content.toLowerCase().includes(search.toLowerCase()) ||
          e.title.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [state.journals, state.fuelSystem.deviations, filter, search]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach((event) => {
      const date = formatDateCN(event.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });
    return groups;
  }, [events]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-apple-textMain dark:text-white tracking-tight flex items-center gap-3">
            <History className="text-blue-500" />
            时间轴
          </h1>
          <p className="text-apple-textSec dark:text-white/40 mt-1 text-lg">
            跨系统的生命足迹聚合审计。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-apple-bg2 dark:bg-white/5 p-1 rounded-xl border border-apple-border dark:border-white/10 backdrop-blur-md">
            {[
              { value: "all" as const, label: "全部", color: "blue" },
              { value: "journal" as const, label: "日记", color: "purple" },
              { value: "fuel" as const, label: "饮食", color: "orange" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  filter === f.value
                    ? `bg-white dark:bg-${f.color}-500 text-${f.color}-600 dark:text-white shadow-sm`
                    : "text-apple-textSec dark:text-white/40 hover:text-apple-textMain dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative">
        <div className="absolute left-[21px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-apple-border dark:via-white/10 to-transparent" />

        <div className="space-y-12">
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-apple-textTer dark:text-white/10">
              <Clock size={64} className="mb-4 opacity-50" />
              <p className="text-xl font-bold">暂无足迹记录</p>
              <p className="text-sm">您的所有行为和日记都将在这里汇聚。</p>
            </div>
          ) : (
            Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date} className="space-y-6 relative">
                <div className="flex items-center gap-4 sticky top-0 z-10 py-2">
                  <div className="w-[43px] h-[43px] rounded-full bg-apple-bgMain dark:bg-[#050505] border border-apple-border dark:border-white/10 flex items-center justify-center shadow-md">
                    <CalendarIcon size={18} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-black text-apple-textMain dark:text-white tracking-tight backdrop-blur-md bg-white/60 dark:bg-[#050505]/80 px-4 py-1 rounded-full border border-apple-border dark:border-white/5">
                    {date}
                  </h3>
                </div>

                <div className="ml-[43px] space-y-6 pl-8">
                  {dateEvents.map((event) => (
                    <div key={event.id} className="relative group">
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-px bg-apple-border dark:bg-white/10 group-hover:bg-blue-500/30 transition-colors" />

                      <GlassCard className="!p-5 hover:translate-x-1 transition-transform border-apple-border dark:border-white/5 hover:border-blue-500/20 dark:hover:border-white/20 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-2 rounded-lg bg-black/5 dark:bg-white/5 ${event.color} border border-apple-border dark:border-white/5`}
                          >
                            {event.icon}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-center">
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase tracking-wider"
                              >
                                {event.title}
                              </Badge>
                              <span className="text-[10px] text-apple-textTer dark:text-white/20 font-mono">
                                {new Date(event.timestamp).toLocaleTimeString(
                                  "zh-CN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </div>
                            <p className="text-apple-textSec dark:text-white/80 text-sm leading-relaxed line-clamp-3">
                              {event.content}
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <div className="flex items-center gap-2 px-6 py-3 bg-apple-bg2 dark:bg-white/5 border border-apple-border dark:border-white/5 rounded-full text-[10px] font-black text-apple-textTer dark:text-white/20 tracking-[0.3em] uppercase">
          End of Life Stream • Keep Growing
        </div>
      </div>
    </div>
  );
}
