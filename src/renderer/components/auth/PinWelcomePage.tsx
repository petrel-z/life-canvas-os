import { Sparkles, Shield, ArrowRight } from 'lucide-react'
import { GlassCard } from '~/renderer/components/GlassCard'
import { Button } from '~/renderer/components/ui/button'

interface PinWelcomePageProps {
  onSetupNow: () => void
  onSetupLater: () => void
}

export function PinWelcomePage({
  onSetupNow,
  onSetupLater,
}: PinWelcomePageProps) {
  return (
    <div className="fixed inset-0 bg-apple-bgMain dark:bg-black flex items-center justify-center p-6">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-100">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-apple-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <GlassCard className="w-full max-w-md text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center border border-purple-500/20">
            <Sparkles className="text-purple-500" size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-apple-textMain dark:text-white">
              欢迎使用 Life Canvas OS
            </h2>
            <p className="text-apple-textSec dark:text-white/40 text-sm mt-1">
              设置密码，保护您的系统
            </p>
          </div>
        </div>

        {/* 功能介绍 */}
        <div className="flex items-start my-4 gap-4 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-apple-border dark:border-white/10">
          <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
            <Shield className="text-purple-500" size={20} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-apple-textMain dark:text-white mb-1">
              密码保护
            </div>
            <div className="text-xs text-apple-textSec dark:text-white/40 leading-relaxed">
              您的系统需要密码才能访问。设置后，每次启动应用时都需要验证密码。
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="text-left space-y-2 px-2 mb-4">
          <div className="text-xs text-apple-textTer dark:text-white/30 font-semibold uppercase tracking-wider">
            设置须知
          </div>
          <div className="text-xs text-apple-textSec dark:text-white/50 space-y-1">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-apple-textTer dark:bg-white/30 mt-1.5 shrink-0" />
              <span>密码必须是 6 位数字</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-apple-textTer dark:bg-white/30 mt-1.5 shrink-0" />
              <span>请妥善保管密码，丢失后无法找回</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-apple-textTer dark:bg-white/30 mt-1.5 shrink-0" />
              <span>稍后设置也可以在设置页面中配置</span>
            </div>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="space-y-3">
          <Button
            className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg"
            onClick={onSetupNow}
          >
            立即设置密码
            <ArrowRight size={18} />
          </Button>
          <Button
            className="w-full h-12 text-apple-textSec dark:text-white/60 hover:text-apple-textMain dark:hover:text-white"
            onClick={onSetupLater}
            variant="outline"
          >
            稍后再设置
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
