import React from 'react';
import { ChevronRight, Lock, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~/renderer/components/ui/avatar';
import { GlassCard } from '~/renderer/components/GlassCard';
import { NAV_ITEMS } from '~/renderer/lib/constants';
import { useNavigate } from 'react-router-dom';
import { useApp } from '~/renderer/contexts/AppContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navigate = useNavigate();
  const { state, lock } = useApp();

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    // 导航到对应路由
    const routeMap: Record<string, string> = {
      dashboard: '/dashboard',
      fuel: '/system/fuel',
      journal: '/journal',
      timeline: '/timeline',
      settings: '/settings',
    };
    navigate(routeMap[tabId] || '/dashboard');
  };

  return (
    <aside className="w-72 sidebar-glass liquid-glass h-screen border-r border-apple-border dark:border-white/5 flex flex-col p-6 z-10">
      {/* Logo */}
      {/* <div className="flex items-center gap-3 mb-10 group cursor-pointer">
        <div className="w-10 h-10 rounded-xl bg-apple-accent shadow-[0_0_20px_rgba(10,132,255,0.2)] flex items-center justify-center text-white">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="font-black tracking-tighter text-xl text-apple-textMain dark:text-white">
            Life Canvas <span className="text-apple-accent">OS</span>
          </h1>
          <div className="text-[10px] text-apple-textTer dark:text-white/30 uppercase tracking-[0.2em] font-bold">
            V1.0.0 TAHOE
          </div>
        </div>
      </div> */}

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
              activeTab === item.id
                ? 'bg-apple-accent/10 dark:bg-white/10 text-apple-accent dark:text-white border border-apple-accent/10 dark:border-white/10'
                : 'text-apple-textSec dark:text-white/40 hover:text-apple-textMain dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3 font-medium">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronRight size={16} className="text-apple-accent" />}
          </button>
        ))}
      </nav>

      {/* 用户信息 */}
      <div className="mt-auto pt-6 border-t border-apple-border dark:border-white/10">
        {state.user.name ? (
          <div className="flex items-center gap-3 px-2">
            <Avatar className="w-11 h-11 rounded-full bg-gradient-to-br from-apple-accent to-blue-600 border-2 border-white dark:border-white/20 shadow-lg">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${state.user.name}`} />
              <AvatarFallback className="bg-gradient-to-br from-apple-accent to-blue-600 text-white font-bold text-base">
                {state.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-apple-textMain dark:text-white">
                {state.user.name}
              </div>
              <div className="text-xs text-apple-textTer dark:text-white/40 truncate">
                {state.user.mbti} • {state.user.lifespan}岁
              </div>
            </div>
            <button
              onClick={lock}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-apple-textSec hover:text-apple-textMain dark:text-white/40 dark:hover:text-white hover:bg-apple-bgHover dark:hover:bg-white/10 transition-all"
              title="锁定应用"
            >
              <Lock size={18} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={lock}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-apple-textSec hover:text-apple-textMain dark:text-white/40 dark:hover:text-white hover:bg-apple-bgHover dark:hover:bg-white/10 transition-all"
              title="锁定应用"
            >
              <Lock size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
