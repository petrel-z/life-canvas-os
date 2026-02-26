import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { Input } from '~/renderer/components/ui/input';
import { toast } from '~/renderer/lib/toast';

export function PinDeletePage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 自动聚焦输入框
  useEffect(() => {
    const firstInput = document.querySelector('input[type="tel"]') as HTMLInputElement;
    firstInput?.focus();
  }, []);

  const handleVerifyPin = async () => {
    if (pin.length !== 6) {
      toast.error('请输入 6 位数字 PIN');
      return;
    }

    if (isVerifying) {
      return; // 防止重复提交
    }

    setIsVerifying(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();

      if (response.ok) {
        // 验证成功，显示确认对话框
        setShowConfirmDialog(true);
        setIsVerifying(false);
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
        setPin('');
        setIsVerifying(false);
      }
    } catch (error) {
      toast.error('网络错误', {
        description: '请检查后端服务是否运行',
      });
      setIsVerifying(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // TODO: 后端可能需要提供 DELETE /api/pin 接口
      // 临时方案：通过后端提供的其他方式删除PIN
      // 这里假设有一个 DELETE 接口

      const response = await fetch('http://127.0.0.1:8000/api/pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();

      if (response.ok || response.status === 204) {
        // 删除成功，更新本地状态
        localStorage.setItem('pin-setup-status', 'skipped');

        toast.success('PIN 已删除', {
          description: '私密日记功能已关闭',
        });

        // 返回设置页面
        setTimeout(() => navigate('/settings', { replace: true }), 1000);
      } else {
        toast.error('删除失败', {
          description: result.message || '请稍后重试',
        });
      }
    } catch (error) {
      toast.error('网络错误', {
        description: '请检查后端服务是否运行',
      });
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 6 && !isVerifying) {
      e.preventDefault();
      handleVerifyPin();
    }
  };

  return (
    <div className="min-h-screen bg-apple-bgMain dark:bg-black flex items-center justify-center p-6">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-100">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-apple-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px]" />
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

        {!showConfirmDialog ? (
          <>
            {/* 标题卡片 */}
            <GlassCard className="!p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                <Trash2 className="text-red-500" size={40} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-apple-textMain dark:text-white">
                  删除 PIN 码
                </h1>
                <p className="text-apple-textSec dark:text-white/40 text-sm mt-2">
                  删除后，私密日记将不再受保护
                </p>
              </div>
            </GlassCard>

            {/* PIN验证表单 */}
            <GlassCard className="!p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-apple-textMain dark:text-white">
                  验证 PIN 码
                </label>
                <div className="relative">
                  <Input
                    type={showPin ? 'text' : 'tel'}
                    inputMode="numeric"
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPin(value);
                    }}
                    onKeyDown={handleKeyDown}
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] h-14"
                    disabled={isVerifying}
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

              {/* 警告信息 */}
              <div className="flex items-start gap-3 p-4 bg-red-500/5 dark:bg-red-500/5 rounded-xl border border-red-500/20 dark:border-red-500/10">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-apple-textSec dark:text-white/60 space-y-1">
                  <p className="font-semibold text-red-500 dark:text-red-400">危险操作</p>
                  <p>• 删除后，私密日记将变为公开</p>
                  <p>• 任何人都可以查看您的私密日记</p>
                  <p>• 此操作不可撤销</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/settings')}
                  className="flex-1"
                  disabled={isVerifying}
                >
                  取消
                </Button>
                <Button
                  onClick={handleVerifyPin}
                  disabled={pin.length !== 6 || isVerifying}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {isVerifying ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      验证中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shield size={18} />
                      验证并继续
                    </span>
                  )}
                </Button>
              </div>
            </GlassCard>
          </>
        ) : (
          <>
            {/* 确认删除对话框 */}
            <GlassCard className="!p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={40} />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-apple-textMain dark:text-white">
                  确认删除 PIN 码？
                </h2>
                <p className="text-apple-textSec dark:text-white/40 text-sm">
                  此操作将永久删除您的 PIN 码保护
                </p>
              </div>

              <div className="p-4 bg-red-500/5 dark:bg-red-500/5 rounded-xl border border-red-500/20 dark:border-red-500/10 text-left">
                <div className="text-xs text-apple-textSec dark:text-white/60 space-y-1">
                  <p className="font-semibold text-red-500 dark:text-red-400 mb-2">删除后将会：</p>
                  <p>• 所有私密日记变为公开可见</p>
                  <p>• 任何人都可以访问您的私密内容</p>
                  <p>• 需要重新设置 PIN 才能恢复保护</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setPin('');
                  }}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  取消
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {isDeleting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      删除中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Trash2 size={18} />
                      确认删除
                    </span>
                  )}
                </Button>
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
}
