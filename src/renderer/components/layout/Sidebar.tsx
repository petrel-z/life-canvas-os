import { ChevronRight, Settings } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '~/renderer/components/ui/avatar'
import { NAV_ITEMS } from '~/renderer/lib/constants'
import { useNavigate } from 'react-router-dom'
import { useApp } from '~/renderer/contexts/AppContext'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navigate = useNavigate()
  const { state } = useApp()

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId)
    // 导航到对应路由
    const routeMap: Record<string, string> = {
      dashboard: '/dashboard',
      fuel: '/system/fuel',
      journal: '/journal',
      timeline: '/timeline',
    }
    navigate(routeMap[tabId] || '/dashboard')
  }

  return (
    <aside className="w-72 sidebar-glass liquid-glass h-screen border-r border-apple-border dark:border-white/5 flex flex-col p-6 z-10">
      {/* 导航菜单 */}
      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map(item => (
          <button
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
              activeTab === item.id
                ? 'bg-apple-accent/10 dark:bg-white/10 text-apple-accent dark:text-white border border-apple-accent/10 dark:border-white/10'
                : 'text-apple-textSec dark:text-white/40 hover:text-apple-textMain dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            key={item.id}
            onClick={() => handleTabClick(item.id)}
          >
            <div className="flex items-center gap-3 font-medium">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {activeTab === item.id && (
              <ChevronRight className="text-apple-accent" size={16} />
            )}
          </button>
        ))}
      </nav>

      {/* 用户信息入口 - 点击跳转到设置页 */}
      <div className="mt-auto pt-6 border-t border-apple-border dark:border-white/10">
        {state.user.name ? (
          <button
            className="w-full flex items-center gap-3 px-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
            onClick={() => navigate('/settings')}
          >
            <Avatar className="w-11 h-11 rounded-full bg-gradient-to-br from-apple-accent to-blue-600 border-2 border-white dark:border-white/20 shadow-lg">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${state.user.name}`}
              />
              <AvatarFallback className="bg-gradient-to-br from-apple-accent to-blue-600 text-white font-bold text-base">
                {state.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold truncate text-apple-textMain dark:text-white">
                {state.user.name}
              </div>
              <div className="text-xs text-apple-textTer dark:text-white/40 truncate">
                {state.user.mbti} • {state.user.lifespan}岁
              </div>
            </div>
            <div className="w-9 h-9 flex items-center justify-center rounded-lg text-apple-textSec hover:text-apple-textMain dark:text-white/40 dark:hover:text-white hover:bg-apple-bgHover dark:hover:bg-white/10 transition-all">
              <Settings size={18} />
            </div>
          </button>
        ) : (
          <button
            className="w-full flex items-center gap-3 px-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
            onClick={() => navigate('/settings')}
          >
            <div className="w-11 h-11 rounded-full bg-apple-bg2 dark:bg-white/10 flex items-center justify-center">
              <Settings size={20} className="text-apple-textSec dark:text-white/40" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold truncate text-apple-textMain dark:text-white">
                设置
              </div>
              <div className="text-xs text-apple-textTer dark:text-white/40">
                配置系统偏好
              </div>
            </div>
            <ChevronRight className="text-apple-textTer dark:text-white/20" size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
