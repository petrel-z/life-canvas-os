import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PinLockScreen } from '../auth/PinLockScreen'
import { PinWelcomePage } from '../auth/PinWelcomePage'
import { FloatingBall } from '../agent/FloatingBall'
import { useApp } from '~/renderer/contexts/AppContext'
import { request } from '~/renderer/api/config'
import { usePinApi } from '~/renderer/hooks'
import { usePinStatus } from '~/renderer/hooks/usePinStatus'
import { getCache, setCache, CACHE_KEYS } from '~/renderer/lib/cacheUtils'

export function MainLayout() {
  const { state, unlock } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const { verifyPin } = usePinApi()
  const { fetchPinStatus, pinStatus } = usePinStatus()
  const [unlockError, setUnlockError] = useState<string>()
  const [isVerifying, setIsVerifying] = useState(false)
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(() => {
    const saved = getCache<string>(CACHE_KEYS.FIRST_LAUNCH)
    // null = 首次启动，false = 已使用过
    return saved === null
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = getCache<string>(CACHE_KEYS.SIDEBAR_COLLAPSED)
    return saved === 'true'
  })

  // 切换侧边栏伸缩状态
  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed
    setIsSidebarCollapsed(newState)
    setCache(CACHE_KEYS.SIDEBAR_COLLAPSED, String(newState))
  }

  // 根据当前路径确定 activeTab
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'dashboard'
    if (path === '/system/fuel') return 'fuel'
    if (path.startsWith('/journal')) return 'journal'
    if (path === '/timeline') return 'timeline'
    if (path.startsWith('/settings')) return 'settings'
    return 'dashboard'
  }

  const [activeTab, setActiveTab] = useState(getActiveTab())

  // 更新 activeTab 当路由变化时
  React.useEffect(() => {
    setActiveTab(getActiveTab())
  }, [location.pathname])

  // 首次启动时检查 PIN 状态
  useEffect(() => {
    if (!isFirstLaunch) {
      // 非首次启动，检查 PIN 状态
      fetchPinStatus().catch(console.error)
    }
  }, [isFirstLaunch])

  // 当 PIN 状态加载完成后，如果不需要启动验证，自动解锁
  useEffect(() => {
    if (pinStatus && (!pinStatus.has_pin || !pinStatus.requirements.startup)) {
      // 未设置 PIN 或启动时不需要验证，自动解锁
      unlock()
    }
  }, [pinStatus])

  const handleUnlock = async (pin: string) => {
    // 验证格式
    if (pin.length !== 6) {
      setUnlockError('PIN 码必须是 6 位数字')
      return
    }

    setIsVerifying(true)
    setUnlockError(undefined)

    const result = await verifyPin(pin)

    if (result.success) {
      // 验证成功
      setUnlockError(undefined)
      unlock()
    } else {
      // 验证失败
      setUnlockError(result.error || '验证失败')
    }

    setIsVerifying(false)
  }

  const handleSetupNow = () => {
    // 标记为非首次启动
    setCache(CACHE_KEYS.FIRST_LAUNCH, 'false')
    setIsFirstLaunch(false)
    // 导航到 PIN 设置页面
    navigate('/settings/pin')
  }

  const handleSetupLater = () => {
    // 标记为非首次启动
    setCache(CACHE_KEYS.FIRST_LAUNCH, 'false')
    setIsFirstLaunch(false)
  }

  // 首次启动，显示欢迎页
  if (isFirstLaunch) {
    return (
      <PinWelcomePage
        onSetupLater={handleSetupLater}
        onSetupNow={handleSetupNow}
      />
    )
  }

  // 非首次启动，检查 PIN 状态
  // 如果 PIN 状态还未加载完成，显示加载状态
  if (pinStatus === null || pinStatus === undefined) {
    return (
      <div className="min-h-screen bg-apple-bgMain dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-accent" />
      </div>
    )
  }

  // 已设置 PIN 且启动时需要验证，显示锁屏
  if (pinStatus.has_pin && pinStatus.requirements.startup) {
    // 如果应用已解锁，直接进入系统
    if (!state.isLocked) {
      return (
        <div className="min-h-screen bg-apple-bgMain dark:bg-black text-apple-textMain dark:text-white flex overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            isCollapsed={isSidebarCollapsed}
            onTabChange={setActiveTab}
            onToggleCollapse={toggleSidebarCollapse}
          />
          <main className="flex-1 h-screen overflow-y-auto">
            <div className="min-h-full max-w-7xl mx-auto px-10 py-12 flex flex-col">
              <Outlet />
            </div>
          </main>
          {/* Agent 悬浮球入口 */}
          <FloatingBall />
        </div>
      )
    }
    // 应用被锁定，显示 PIN 验证
    return <PinLockScreen error={unlockError} onUnlock={handleUnlock} />
  }

  // 未设置 PIN 或启动时不需要验证，直接进入系统
  return (
    <div className="min-h-screen bg-apple-bgMain dark:bg-black text-apple-textMain dark:text-white flex overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-100">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" />
      </div>

      {/* 侧边栏 */}
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        onTabChange={setActiveTab}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* 主内容区域 */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="h-full max-w-7xl mx-auto px-10 py-12 flex flex-col">
          <Outlet />
        </div>
      </main>

      {/* Agent 悬浮球入口 */}
      <FloatingBall />
    </div>
  )
}
