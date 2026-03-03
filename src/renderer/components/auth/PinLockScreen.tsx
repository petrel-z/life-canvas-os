import type React from 'react'
import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import { GlassCard } from '~/renderer/components/GlassCard'

interface PinLockScreenProps {
  onUnlock: (pin: string) => void | Promise<void>
  error?: string
}

export function PinLockScreen({ onUnlock, error }: PinLockScreenProps) {
  const [pinInput, setPinInput] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)

  const handleUnlock = async () => {
    if (pinInput.length === 6 && !isUnlocking) {
      setIsUnlocking(true)
      try {
        await onUnlock(pinInput)
      } finally {
        setIsUnlocking(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pinInput.length === 6 && !isUnlocking) {
      handleUnlock()
    }
  }

  return (
    <div className="fixed inset-0 bg-apple-bgMain dark:bg-black flex items-center justify-center p-6">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-100">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-apple-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <GlassCard className="w-full max-w-sm text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-apple-textTer dark:text-white/50 border border-apple-border dark:border-white/10">
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-apple-textMain dark:text-white">
              系统已锁定
            </h2>
            <p className="text-apple-textSec dark:text-white/40 text-sm m-2">
              请输入安全 PIN 码以访问您的 OS
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <input
            autoFocus
            className="w-full text-center bg-black/5 dark:bg-white/5 border border-apple-border dark:border-white/10 rounded-2xl py-4 text-3xl tracking-[1em] text-apple-textMain dark:text-white focus:outline-none focus:ring-2 focus:ring-apple-accent/30 placeholder:text-apple-textTer/30 dark:placeholder:text-white/20"
            maxLength={6}
            onChange={e => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6)
              setPinInput(value)
            }}
            onKeyDown={handleKeyDown}
            placeholder="••••••"
            type="password"
            value={pinInput}
          />

          {error && (
            <p className="text-sm text-apple-error dark:text-red-400">
              {error}
            </p>
          )}

          <button
            className="w-full py-4 bg-apple-accent text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            disabled={pinInput.length !== 6 || isUnlocking}
            onClick={handleUnlock}
          >
            {isUnlocking ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                验证中...
              </>
            ) : (
              <>
                解锁进入 <Unlock size={18} />
              </>
            )}
          </button>
        </div>
      </GlassCard>
    </div>
  )
}
