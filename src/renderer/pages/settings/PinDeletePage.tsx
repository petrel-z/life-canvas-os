import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, AlertTriangle } from 'lucide-react';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { toast } from '~/renderer/lib/toast';
import {
  PIN_CONFIG,
  PIN_MESSAGES,
  type PinApiError,
} from '~/renderer/lib/pin';
import { usePinApi } from '~/renderer/hooks';
import { usePinStatus } from '~/renderer/hooks/usePinStatus';
import { PinLockScreen } from '~/renderer/components/auth/PinLockScreen';
import { LoadingSpinner } from '~/renderer/components/pin';

export function PinDeletePage() {
  const navigate = useNavigate();
  const { verifyWithErrorHandling, deleteWithErrorHandling } = usePinApi();
  const { updatePinStatusAfterOperation } = usePinStatus();

  const [verifiedPin, setVerifiedPin] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleVerifyPin = async (pin: string) => {
    await verifyWithErrorHandling(pin, toast);
    setVerifiedPin(pin);
    setShowConfirmDialog(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteWithErrorHandling(verifiedPin, toast);
      localStorage.setItem('pin-setup-status', 'skipped');

      // 更新 PIN 状态缓存
      await updatePinStatusAfterOperation();

      toast.success(PIN_MESSAGES.DELETE_SUCCESS, {
        description: PIN_MESSAGES.DELETE_SUCCESS_DESC,
      });

      setTimeout(() => navigate('/settings', { replace: true }), PIN_CONFIG.NAVIGATION_DELAY);
    } catch (error: unknown) {
      // 错误已在 hook 中处理
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      {!showConfirmDialog ? (
        <PinLockScreen
          title="删除密码"
          description="请输入密码以验证身份并删除密码保护"
          unlockButtonText="验证并继续"
          unlockingText="验证中..."
          showCancelButton={true}
          cancelButtonText="取消"
          onCancel={() => navigate('/settings')}
          onUnlock={handleVerifyPin}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          {/* 背景装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-100">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-apple-accent/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px]" />
          </div>

          <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
            {/* 确认删除对话框 */}
            <GlassCard className="!p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-apple-textMain dark:text-white">
                  确认删除密码
                </h2>
                <p className="text-apple-textSec dark:text-white/40 text-sm mt-2">
                  您确定要删除密码吗？此操作不可撤销
                </p>
              </div>

              {/* 最终警告 */}
              <div className="flex items-start gap-3 p-4 bg-red-500/5 dark:bg-red-500/5 rounded-xl border border-red-500/20 dark:border-red-500/10">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-apple-textSec dark:text-white/60 space-y-1">
                  <p className="font-semibold text-red-500 dark:text-red-400">最后提醒</p>
                  <p>• 删除后所有私密日记将变为公开可见</p>
                  <p>• 任何人都将能够查看您的私密内容</p>
                  <p>• 此操作无法撤销，请谨慎操作</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  取消
                </Button>
                <Button
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <LoadingSpinner text="删除中..." />
                  ) : (
                    '确认删除'
                  )}
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </>
  );
}
