import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '~/renderer/components/layout/MainLayout'
import { DashboardPage } from '~/renderer/pages/dashboard/DashboardPage'
import { FuelSystemPage } from '~/renderer/pages/systems/FuelSystemPage'
import { JournalPage } from '~/renderer/pages/journal/JournalPage'
import { JournalDetailPage } from '~/renderer/pages/journal/JournalDetailPage'
import { JournalEditorPage } from '~/renderer/pages/journal/JournalEditorPage'
import { TimelinePage } from '~/renderer/pages/timeline/TimelinePage'
import { SettingsPage } from '~/renderer/pages/settings/SettingsPage'
import { PinSetupPage } from '~/renderer/pages/settings/PinSetupPage'
import { PinChangePage } from '~/renderer/pages/settings/PinChangePage'
import { PinDeletePage } from '~/renderer/pages/settings/PinDeletePage'
import { InsightDetailPage } from '~/renderer/pages/insight/InsightDetailPage'
import { InsightHistoryPage } from '~/renderer/pages/insight/InsightHistoryPage'
import { InsightHistoryDetailPage } from '~/renderer/pages/insight/InsightHistoryDetailPage'

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
          💡 敬请期待更多功能
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
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<FuelSystemPage />} path="/system/fuel" />
          <Route element={<JournalPage />} path="/journal" />
          <Route element={<JournalEditorPage />} path="/journal/new" />
          <Route element={<JournalDetailPage />} path="/journal/:id" />
          <Route element={<JournalEditorPage />} path="/journal/:id/edit" />
          <Route element={<TimelinePage />} path="/timeline" />
          <Route element={<SettingsPage />} path="/settings" />
          <Route element={<PinSetupPage />} path="/settings/pin" />
          <Route element={<PinChangePage />} path="/settings/pin/change" />
          <Route element={<PinDeletePage />} path="/settings/pin/delete" />
          <Route element={<InsightDetailPage />} path="/insights/detail" />
          <Route element={<InsightHistoryPage />} path="/insights/history" />
          <Route
            element={<InsightHistoryDetailPage />}
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
