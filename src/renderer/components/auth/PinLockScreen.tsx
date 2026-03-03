import React, { useState, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { GlassCard } from '~/renderer/components/GlassCard';

interface PinLockScreenProps {
  onUnlock: (pin: string) => void | Promise<void>;
  onCancel?: () => void;
  error?: string;
  title?: string;
  description?: string;
  unlockButtonText?: string;
  unlockingText?: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  initialPin?: string;
}

export function PinLockScreen({
  onUnlock,
  onCancel,
  error,
  title = '系统已锁定',
  description = '请输入安全 PIN 码以访问您的 OS',
  unlockButtonText = '解锁进入',
  unlockingText = '验证中...',
  showCancelButton = false,
  cancelButtonText = '取消',
  initialPin = '',
}: PinLockScreenProps) {
  const [pinInput, setPinInput] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // 当 initialPin 变化时更新输入框的值
  // useEffect(() => {
  //   setPinInput(initialPin || '');
  // }, [initialPin]);

  const handleUnlock = async () => {
    if (pinInput.length === 6 && !isUnlocking) {
      setIsUnlocking(true);
      try {
        await onUnlock(pinInput);
      } finally {
        setIsUnlocking(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pinInput.length === 6 && !isUnlocking) {
      handleUnlock();
    }
  };

  return (
    <div className="fixed inset-0 bg-apple-bgMain dark:bg-black flex items-center justify-center p-6 z-[9999]">
      {/* 背景装饰 - 毛玻璃效果 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-apple-accent/5 dark:bg-apple-accent/10 rounded-full blur-[100px] backdrop-blur-sm" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] backdrop-blur-sm" />
      </div>

      <GlassCard className="w-full max-w-sm text-center space-y-8 animate-in zoom-in-95 duration-500 relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-apple-textTer dark:text-white/50 border border-apple-border dark:border-white/10">
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-apple-textMain dark:text-white">{title}</h2>
            <p className="text-apple-textSec dark:text-white/40 text-sm m-2">
              {description}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="••••••"
            value={pinInput}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPinInput(value);
            }}
            onKeyDown={handleKeyDown}
            className="w-full text-center bg-black/5 dark:bg-white/5 border border-apple-border dark:border-white/10 rounded-2xl py-4 text-3xl tracking-[1em] text-apple-textMain dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-accent/30 placeholder:text-apple-textTer/30 dark:placeholder:text-white/20"
            maxLength={6}
            autoFocus
          />

          {error && (
            <p className="text-sm text-apple-error dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            {showCancelButton && onCancel && (
              <button
                onClick={onCancel}
                disabled={isUnlocking}
                className="flex-1 py-4 text-apple-textSec dark:text-white/40 text-sm hover:text-apple-textMain dark:hover:text-white border border-apple-border dark:border-white/10 rounded-2xl transition-colors disabled:opacity-50"
              >
                {cancelButtonText}
              </button>
            )}

            <button
              onClick={handleUnlock}
              disabled={pinInput.length !== 6 || isUnlocking}
              className="flex-1 py-4 bg-apple-accent text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isUnlocking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {unlockingText}
                </>
              ) : (
                <>
                  {unlockButtonText} <Unlock size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
