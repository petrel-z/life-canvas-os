import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle2, Lock, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { Input } from '~/renderer/components/ui/input';
import { toast } from '~/renderer/lib/toast';

type Step = 'verify-old' | 'enter-new' | 'confirm-new';

export function PinChangePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('verify-old');
  const [oldPin, setOldPin] = useState('');
  const [verifiedOldPin, setVerifiedOldPin] = useState(''); // 保存已验证的旧PIN
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 自动聚焦第一个输入框
  useEffect(() => {
    const firstInput = document.querySelector('input[type="tel"], input[type="password"]') as HTMLInputElement;
    firstInput?.focus();
  }, [currentStep]);

  // 步骤1：验证旧PIN
  const handleVerifyOldPin = async () => {
    if (oldPin.length !== 6) {
      toast.error('请输入 6 位数字 PIN');
      return;
    }

    if (isSubmitting) {
      return; // 防止重复提交
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: oldPin }),
      });

      const result = await response.json();

      if (response.ok) {
        // 验证成功，保存旧PIN并进入下一步
        setVerifiedOldPin(oldPin);
        setCurrentStep('enter-new');
        setOldPin('');
      } else {
        if (result.code === 401) {
          const attempts = result.data?.attempts_remaining || 0;
          toast.error(result.message || 'PIN 验证失败', {
            description: `剩余尝试次数：${attempts}`,
          });
        } else if (result.code === 429) {
          const seconds = result.data?.remaining_seconds || 30;
          toast.error(result.message || 'PIN 已锁定', {
            description: `请 ${seconds} 秒后重试`,
          });
        } else {
          toast.error('验证失败', {
            description: result.message || '请稍后重试',
          });
        }
        setOldPin('');
      }
    } catch (error) {
      toast.error('网络错误', {
        description: '请检查后端服务是否运行',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 步骤2&3：设置新PIN
  const handleSubmitNewPin = async () => {
    if (newPin.length !== 6) {
      toast.error('请输入 6 位数字 PIN');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('两次输入的 PIN 不一致');
      setConfirmPin('');
      return;
    }
    if (newPin === verifiedOldPin) {
      toast.error('新 PIN 不能与旧 PIN 相同');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/pin/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_pin: verifiedOldPin,
          new_pin: newPin,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('PIN 修改成功', {
          description: '请妥善保管您的新 PIN 码',
        });
        // 返回设置页面
        setTimeout(() => navigate('/settings', { replace: true }), 1000);
      } else {
        if (result.code === 401) {
          toast.error('旧 PIN 验证失败', {
            description: '请重新输入',
          });
          setCurrentStep('verify-old');
          setOldPin('');
          setVerifiedOldPin('');
          setNewPin('');
          setConfirmPin('');
        } else {
          toast.error('PIN 修改失败', {
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

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      action();
    }
  };

  const isNewPinValid = newPin.length === 6;
  const isConfirmValid = confirmPin.length === 6 && newPin === confirmPin;

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
          onClick={() => navigate('/settings')}
          className="mb-4"
        >
          <ArrowLeft size={20} />
        </Button>

        {/* 标题卡片 */}
        <GlassCard className="!p-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center">
            {currentStep === 'verify-old' ? (
              <Lock className="text-purple-500" size={40} />
            ) : (
              <KeyRound className="text-purple-500" size={40} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-apple-textMain dark:text-white">
              {currentStep === 'verify-old' ? '验证 PIN 码' : '修改 PIN 码'}
            </h1>
            <p className="text-apple-textSec dark:text-white/40 text-sm mt-2">
              {currentStep === 'verify-old'
                ? '请输入当前 PIN 码以继续'
                : currentStep === 'enter-new'
                ? '请输入新的 6 位 PIN 码'
                : '请再次输入新 PIN 码确认'}
            </p>
          </div>
        </GlassCard>

        {/* 步骤1：验证旧PIN */}
        {currentStep === 'verify-old' && (
          <GlassCard className="!p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-apple-textMain dark:text-white">
                当前 PIN 码
              </label>
              <div className="relative">
                <Input
                  type={showOldPin ? 'text' : 'tel'}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={oldPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOldPin(value);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, handleVerifyOldPin)}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] h-14"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPin(!showOldPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-textTer hover:text-apple-textSec dark:hover:text-white/60"
                >
                  {showOldPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* 强度指示器 */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      i <= oldPin.length
                        ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                        : 'bg-apple-border dark:bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleVerifyOldPin}
              disabled={oldPin.length !== 6 || isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  验证中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield size={18} />
                  验证 PIN 码
                </span>
              )}
            </Button>
          </GlassCard>
        )}

        {/* 步骤2：输入新PIN */}
        {currentStep === 'enter-new' && (
          <GlassCard className="!p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-apple-textMain dark:text-white">
                新 PIN 码
              </label>
              <div className="relative">
                <Input
                  type={showNewPin ? 'text' : 'tel'}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={newPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setNewPin(value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPin.length === 6) {
                      setCurrentStep('confirm-new');
                    }
                  }}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] h-14"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-textTer hover:text-apple-textSec dark:hover:text-white/60"
                >
                  {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* 强度指示器 */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      i <= newPin.length
                        ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                        : 'bg-apple-border dark:bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep('verify-old');
                  setOldPin('');
                  setVerifiedOldPin('');
                  setNewPin('');
                }}
                className="flex-1"
              >
                返回
              </Button>
              <Button
                onClick={() => setCurrentStep('confirm-new')}
                disabled={newPin.length !== 6}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                下一步
              </Button>
            </div>
          </GlassCard>
        )}

        {/* 步骤3：确认新PIN */}
        {currentStep === 'confirm-new' && (
          <GlassCard className="!p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-apple-textMain dark:text-white">
                确认新 PIN 码
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPin ? 'text' : 'tel'}
                  inputMode="numeric"
                  placeholder="••••••"
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setConfirmPin(value);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, handleSubmitNewPin)}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] h-14"
                  disabled={isSubmitting}
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
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep('enter-new');
                  setConfirmPin('');
                }}
                className="flex-1"
                disabled={isSubmitting}
              >
                返回
              </Button>
              <Button
                onClick={handleSubmitNewPin}
                disabled={!isConfirmValid || isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    修改中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield size={18} />
                    确认修改
                  </span>
                )}
              </Button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
