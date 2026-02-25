import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PinLockScreen } from '../auth/PinLockScreen';
import { useApp } from '~/renderer/contexts/AppContext';

export function MainLayout() {
  const { state, unlock } = useApp();
  const location = useLocation();
  const [unlockError, setUnlockError] = useState<string>();

  // 根据当前路径确定 activeTab
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/system/fuel') return 'fuel';
    if (path.startsWith('/journal')) return 'journal';
    if (path === '/timeline') return 'timeline';
    if (path === '/settings') return 'settings';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // 更新 activeTab 当路由变化时
  React.useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  const handleUnlock = (pin: string) => {
    // TODO: 实际的 PIN 验证逻辑
    // 生产环境应该：
    // 1. 从安全存储（如 electron safeStorage）读取存储的 PIN 哈希
    // 2. 使用 timing-safe 比较 API 验证 PIN
    // 3. 限制尝试次数，防止暴力破解

    // 当前为演示模式：接受任意 4 位 PIN
    if (pin.length === 4 && /^\d+$/.test(pin)) {
      setUnlockError(undefined);
      unlock();
    } else {
      setUnlockError('PIN 码必须是 4 位数字');
    }
  };

  // 如果应用被锁定，显示锁屏界面
  if (state.isLocked) {
    return <PinLockScreen onUnlock={handleUnlock} error={unlockError} />;
  }

  return (
    <div className="min-h-screen bg-apple-bgMain dark:bg-black text-apple-textMain dark:text-white flex overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-100">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" />
      </div>

      {/* 侧边栏 */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 主内容区域 */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-10 py-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
