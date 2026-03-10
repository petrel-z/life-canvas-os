import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '~/renderer/components/layout/MainLayout'
import { PageLoading } from '~/renderer/components/ui/PageLoading'

// 懒加载页面组件（使用命名导出）
const DashboardPage = lazy(() =>
  import('~/renderer/pages/dashboard/DashboardPage').then(m => ({
    default: m.DashboardPage,
  }))
)
const FuelSystemPage = lazy(() =>
  import('~/renderer/pages/systems/FuelSystemPage').then(m => ({
    default: m.FuelSystemPage,
  }))
)
const JournalPage = lazy(() =>
  import('~/renderer/pages/journal/JournalPage').then(m => ({
    default: m.JournalPage,
  }))
)
const TimelinePage = lazy(() =>
  import('~/renderer/pages/timeline/TimelinePage').then(m => ({
    default: m.TimelinePage,
  }))
)
const SettingsPage = lazy(() =>
  import('~/renderer/pages/settings/SettingsPage').then(m => ({
    default: m.SettingsPage,
  }))
)
const PinSetupPage = lazy(() =>
  import('~/renderer/pages/settings/PinSetupPage').then(m => ({
    default: m.PinSetupPage,
  }))
)
const PinChangePage = lazy(() =>
  import('~/renderer/pages/settings/PinChangePage').then(m => ({
    default: m.PinChangePage,
  }))
)
const PinDeletePage = lazy(() =>
  import('~/renderer/pages/settings/PinDeletePage').then(m => ({
    default: m.PinDeletePage,
  }))
)
const InsightDetailPage = lazy(() =>
  import('~/renderer/pages/insight/InsightDetailPage').then(m => ({
    default: m.InsightDetailPage,
  }))
)
const InsightHistoryPage = lazy(() =>
  import('~/renderer/pages/insight/InsightHistoryPage').then(m => ({
    default: m.InsightHistoryPage,
  }))
)
const InsightHistoryDetailPage = lazy(() =>
  import('~/renderer/pages/insight/InsightHistoryDetailPage').then(m => ({
    default: m.InsightHistoryDetailPage,
  }))
)

// 页面组件（暂时使用占位符）
function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-black text-apple-textMain dark:text-white tracking-tight">
          {name}
        </h1>
        <p className="text-apple-textSec dark:text-white/40 mt-2 text-lg">
          此页面正在开发中...
        </p>
      </div>

      <div className="glass-effect rounded-2xl p-8 text-center">
        <p className="text-apple-textSec dark:text-white/60">
          敬请期待更多功能
        </p>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        {/* 默认重定向到 dashboard */}
        <Route element={<Navigate replace to="/dashboard" />} path="/" />

        {/* 主应用路由（带布局） */}
        <Route element={<MainLayout />}>
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <DashboardPage />
              </Suspense>
            }
            path="/dashboard"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <FuelSystemPage />
              </Suspense>
            }
            path="/system/fuel"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <JournalPage />
              </Suspense>
            }
            path="/journal"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <TimelinePage />
              </Suspense>
            }
            path="/timeline"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <SettingsPage />
              </Suspense>
            }
            path="/settings"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <PinSetupPage />
              </Suspense>
            }
            path="/settings/pin"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <PinChangePage />
              </Suspense>
            }
            path="/settings/pin/change"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <PinDeletePage />
              </Suspense>
            }
            path="/settings/pin/delete"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <InsightDetailPage />
              </Suspense>
            }
            path="/insights/detail"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <InsightHistoryPage />
              </Suspense>
            }
            path="/insights/history"
          />
          <Route
            element={
              <Suspense fallback={<PageLoading />}>
                <InsightHistoryDetailPage />
              </Suspense>
            }
            path="/insights/history/detail"
          />
          <Route
            element={<PlaceholderPage name="子系统详情" />}
            path="/system/:type"
          />
        </Route>
      </Routes>
    </HashRouter>
  )
}
