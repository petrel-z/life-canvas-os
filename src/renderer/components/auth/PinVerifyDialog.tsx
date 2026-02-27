import React, { useState } from "react";
import { X, Lock } from "lucide-react";
import { GlassCard } from "~/renderer/components/GlassCard";
import { Input } from "~/renderer/components/ui/input";
import { Button } from "~/renderer/components/ui/button";
import { pinApi } from "~/renderer/api";
import { PIN_CONFIG } from "~/renderer/lib/pin";
import type { PinApiError } from "~/renderer/lib/pin";

interface PinVerifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  error?: string;
}

export function PinVerifyDialog({
  isOpen,
  onClose,
  onVerify,
  error: externalError,
}: PinVerifyDialogProps) {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(externalError || "");

  const handleSubmit = async () => {
    if (pin.length !== PIN_CONFIG.LENGTH) {
      setError(`请输入 ${PIN_CONFIG.LENGTH} 位数字 PIN`);
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const response = await pinApi.verify(pin);

      if (!response.ok) {
        const error = (await response.json()) as PinApiError;

        // 验证失败
        if (error.code === 401) {
          const attempts = error.data?.attempts_remaining || 0;
          setError(
            `${error.message || "PIN 验证失败"}，剩余尝试次数：${attempts}`,
          );
        } else if (error.code === 429) {
          const seconds =
            error.data?.remaining_seconds || PIN_CONFIG.DEFAULT_LOCK_SECONDS;
          setError(`${error.message || "PIN 已锁定"}，请 ${seconds} 秒后重试`);
        } else if (error.code === 424) {
          setError("PIN 未设置");
        } else {
          setError(error.message || "验证失败");
        }
        setPin("");
        return;
      }

      // 验证成功
      const success = await onVerify(pin);
      if (success) {
        handleClose();
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPin("");
    setError("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && pin.length === PIN_CONFIG.LENGTH && !isVerifying) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-sm !p-8 space-y-8 animate-in zoom-in-95 duration-200 relative z-[101]">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Lock className="text-purple-500" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-apple-textMain dark:text-white">
                私密日记
              </h3>
              <p className="text-sm text-apple-textSec dark:text-white/60 mt-1">
                请输入 PIN 码以查看
              </p>
            </div>
          </div>
        </div>

        {/* PIN 输入 */}
        <div className="space-y-2 mt-2">
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="••••••"
            value={pin}
            onChange={(e) => {
              const value = e.target.value
                .replace(/\D/g, "")
                .slice(0, PIN_CONFIG.LENGTH);
              setPin(value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
            maxLength={PIN_CONFIG.LENGTH}
            disabled={isVerifying}
            className="text-center text-2xl tracking-[0.5em] h-14"
            autoFocus
          />

          {/* 强度指示器 */}
          <div className="flex gap-1">
            {Array.from({ length: PIN_CONFIG.LENGTH }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < pin.length
                    ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                    : "bg-apple-border dark:bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-apple-error dark:text-red-400 text-center">
              {error}
            </p>
          )}
        </div>

        {/* 按钮 */}
        <div className="flex gap-4 mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isVerifying}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pin.length !== PIN_CONFIG.LENGTH || isVerifying}
            className="flex-1 bg-purple-500 hover:bg-purple-600"
          >
            {isVerifying ? "验证中..." : "验证"}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
