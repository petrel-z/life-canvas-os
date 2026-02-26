import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { Input } from '~/renderer/components/ui/input';
import { toast } from '~/renderer/lib/toast';

export function PinSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 获取返回 URL
  const returnUrl = (location.state as any)?.returnUrl || '/journal';

  // 自动聚焦第一个输入框
  useEffect(() => {
    const firstInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
    firstInput?.focus();
  }, []);

  const handleSubmit = async () => {
    // 验证
    if (pin.length !== 6) {
      toast.error('请输入 6 位数字 PIN');
      return;
    }
    if (pin !== confirmPin) {
      toast.error('两次输入的 PIN 不一致');
      setConfirmPin('');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/pin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();

      if (response.ok) {
        // 标记 PIN 设置已完成
        localStorage.setItem('pin-setup-status', 'completed');

        toast.success('PIN 设置成功', {
          description: '您现在可以使用私密日记功能了',
        });
        // 返回原页面
        setTimeout(() => navigate(returnUrl, { replace: true }), 1000);
      } else {
        if (result.code === 409) {
          toast.error('PIN 已设置', {
            description: '您已经设置过 PIN 码了',
          });
        } else {
          toast.error('PIN 设置失败', {
            description: result.message || '请稍后重试',
          });
        }
      }
    } catch (error) {
      toast.error('网络错误', {
        description: '请检查后端服务是否运行',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 只允许数字，最多 6 位
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(value);
  };

  const isPinValid = pin.length === 6;
  const isConfirmValid = confirmPin.length === 6 && pin === confirmPin;

  return (
    <div className="min-h-screen bg-apple-bgMain dark:bg-black flex items-center justify-center p-6">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-100">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-apple-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(returnUrl)}
          className="mb-4"
        >
          <ArrowLeft size={20} />
        </Button>

        {/* 标题卡片 */}
        <GlassCard className="!p-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center">
            <Shield className="text-purple-500" size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-apple-textMain dark:text-white">
              设置 PIN 码
            </h1>
            <p className="text-apple-textSec dark:text-white/40 text-sm mt-2">
              PIN 码用于保护您的私密日记（6 位数字）
            </p>
          </div>
        </GlassCard>

        {/* 设置表单 */}
        <GlassCard className="!p-8 space-y-6">
          {/* PIN 输入 */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-apple-textMain dark:text-white">
              设置 PIN 码
            </label>
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'tel'}
                inputMode="numeric"
                placeholder="••••••"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] h-14"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-textTer hover:text-apple-textSec dark:hover:text-white/60"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* 强度指示器 */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i <= pin.length
                      ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : 'bg-apple-border dark:bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 确认 PIN 输入 */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-apple-textMain dark:text-white">
              确认 PIN 码
            </label>
            <div className="relative">
              <Input
                type={showConfirmPin ? 'text' : 'tel'}
                inputMode="numeric"
                placeholder="••••••"
                value={confirmPin}
                onChange={handleConfirmPinChange}
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] h-14"
                disabled={!isPinValid}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-textTer hover:text-apple-textSec dark:hover:text-white/60"
              >
                {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* 匹配状态 */}
            {confirmPin.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                {isConfirmValid ? (
                  <>
                    <CheckCircle2 className="text-green-500" size={14} />
                    <span className="text-green-500">PIN 码一致</span>
                  </>
                ) : (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-apple-error" />
                    <span className="text-apple-error dark:text-red-400">PIN 码不一致</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="flex items-start gap-3 p-4 bg-apple-accent/5 dark:bg-purple-500/5 rounded-xl border border-apple-accent/10 dark:border-purple-500/10">
            <Lock className="text-purple-500 shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-apple-textSec dark:text-white/60 space-y-1">
              <p>• PIN 码必须是 6 位数字</p>
              <p>• 请妥善保管 PIN 码，丢失后无法找回</p>
              <p>• 设置后可随时在设置中修改</p>
            </div>
          </div>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={!isPinValid || !isConfirmValid || isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                设置中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Shield size={18} />
                确认设置
              </span>
            )}
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
