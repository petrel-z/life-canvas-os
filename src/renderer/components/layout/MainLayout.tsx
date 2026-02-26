import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PinLockScreen } from '../auth/PinLockScreen';
import { PinWelcomePage } from '../auth/PinWelcomePage';
import { useApp } from '~/renderer/contexts/AppContext';

type PinSetupStatus = 'completed' | 'skipped' | null;

export function MainLayout() {
  const { state, unlock } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [unlockError, setUnlockError] = useState<string>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinSetupStatus, setPinSetupStatus] = useState<PinSetupStatus>(() => {
    const saved = localStorage.getItem('pin-setup-status');
    if (saved === 'completed' || saved === 'skipped') {
      return saved;
    }
    return null;
  });

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

  const handleUnlock = async (pin: string) => {
    // 验证格式
    if (pin.length !== 6) {
      setUnlockError('PIN 码必须是 6 位数字');
      return;
    }

    setIsVerifying(true);
    setUnlockError(undefined);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();

      if (response.ok) {
        // 验证成功
        setUnlockError(undefined);
        unlock();
      } else {
        // 验证失败
        if (result.code === 401) {
          const attempts = result.data?.attempts_remaining || 0;
          setUnlockError(`${result.message || 'PIN 验证失败'}，剩余尝试次数：${attempts}`);
        } else if (result.code === 429) {
          const seconds = result.data?.remaining_seconds || 30;
          setUnlockError(`${result.message || 'PIN 已锁定'}，请 ${seconds} 秒后重试`);
        } else if (result.code === 424) {
          // PIN 未设置，直接解锁
          setUnlockError(undefined);
          unlock();
        } else {
          setUnlockError(result.message || '验证失败');
        }
      }
    } catch (err) {
      setUnlockError('网络错误，请检查后端服务');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetupNow = () => {
    // 标记为已引导过（但不代表已完成）
    localStorage.setItem('pin-setup-status', 'skipped');
    setPinSetupStatus('skipped');
    // 导航到 PIN 设置页面
    navigate('/settings/pin');
  };

  const handleSetupLater = () => {
    // 标记为稍后设置，不再显示欢迎页
    localStorage.setItem('pin-setup-status', 'skipped');
    setPinSetupStatus('skipped');
  };

  // 如果应用被锁定，显示锁屏界面
  if (state.isLocked) {
    // 首次启动，显示欢迎页
    if (pinSetupStatus === null) {
      return <PinWelcomePage onSetupNow={handleSetupNow} onSetupLater={handleSetupLater} />;
    }
    // 已设置 PIN，显示锁屏
    return <PinLockScreen onUnlock={handleUnlock} error={unlockError} />;
  }

  // 首次启动且未锁定，显示欢迎页
  if (pinSetupStatus === null) {
    return <PinWelcomePage onSetupNow={handleSetupNow} onSetupLater={handleSetupLater} />;
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
