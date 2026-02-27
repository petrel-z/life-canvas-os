import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '~/renderer/components/layout/MainLayout';
import { DashboardPage } from '~/renderer/pages/dashboard/DashboardPage';
import { FuelSystemPage } from '~/renderer/pages/systems/FuelSystemPage';
import { JournalPage } from '~/renderer/pages/journal/JournalPage';
import { JournalDetailPage } from '~/renderer/pages/journal/JournalDetailPage';
import { JournalEditorPage } from '~/renderer/pages/journal/JournalEditorPage';
import { TimelinePage } from '~/renderer/pages/timeline/TimelinePage';
import { SettingsPage } from '~/renderer/pages/settings/SettingsPage';
import { PinSetupPage } from '~/renderer/pages/settings/PinSetupPage';
import { PinChangePage } from '~/renderer/pages/settings/PinChangePage';
import { PinDeletePage } from '~/renderer/pages/settings/PinDeletePage';

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
  );
}

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        {/* 默认重定向到 dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 主应用路由（带布局） */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/system/fuel" element={<FuelSystemPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/new" element={<JournalEditorPage />} />
          <Route path="/journal/:id" element={<JournalDetailPage />} />
          <Route path="/journal/:id/edit" element={<JournalEditorPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/pin" element={<PinSetupPage />} />
          <Route path="/settings/pin/change" element={<PinChangePage />} />
          <Route path="/settings/pin/delete" element={<PinDeletePage />} />
          <Route path="/system/:type" element={<PlaceholderPage name="子系统详情" />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
