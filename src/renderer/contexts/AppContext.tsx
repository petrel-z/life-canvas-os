import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AppState, DimensionType } from '~/shared/types';
import { INITIAL_STATE } from '~/renderer/lib/constants';

interface AppContextType {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  updateDimension: (type: DimensionType, score: number) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  lock: () => void;
  unlock: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // 从 localStorage 加载初始状态
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('life-canvas-state');
      if (saved) {
        return { ...INITIAL_STATE, ...JSON.parse(saved) };
      }
    } catch (error) {
      // localStorage 访问失败（隐私模式或配额超满），使用初始状态
      // 生产环境可以考虑添加错误上报
    }
    return INITIAL_STATE;
  });

  // 保存状态到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('life-canvas-state', JSON.stringify(state));
    } catch (error) {
      // localStorage 保存失败（通常是配额超满）
      // 生产环境可以考虑添加用户提示或错误上报
    }
  }, [state]);

  // 主题切换逻辑（带动画）
  useEffect(() => {
    const root = window.document.documentElement;

    // 添加主题切换动画类
    root.classList.add('theme-transitioning');

    const isDark =
      state.theme === 'dark' ||
      (state.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // 动画完成后移除过渡类
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300); // 与 CSS 过渡时间匹配

    return () => clearTimeout(timeout);
  }, [state.theme]);

  // 更新状态
  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // 更新单个维度评分
  const updateDimension = (type: DimensionType, score: number) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    setState((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [type]: clampedScore,
      },
    }));
  };

  // 设置主题
  const setTheme = (theme: 'light' | 'dark' | 'auto') => {
    updateState({ theme });
  };

  // 锁定应用
  const lock = () => {
    updateState({ isLocked: true });
  };

  // 解锁应用
  const unlock = () => {
    updateState({ isLocked: false });
  };

  const value: AppContextType = {
    state,
    updateState,
    updateDimension,
    setTheme,
    lock,
    unlock,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook 用于使用 AppContext
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
