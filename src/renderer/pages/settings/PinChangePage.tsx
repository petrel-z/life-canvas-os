import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, KeyRound } from "lucide-react";
import { GlassCard } from "~/renderer/components/GlassCard";
import { Button } from "~/renderer/components/ui/button";
import { toast } from "~/renderer/lib/toast";
import {
  PIN_CONFIG,
  PIN_MESSAGES,
  type PinApiError,
} from "~/renderer/lib/pin";
import { usePinApi, handlePinApiError } from "~/renderer/hooks";
import {
  PinInput,
  PinStrengthIndicator,
  PinMatchIndicator,
  LoadingSpinner,
} from "~/renderer/components/pin";

type Step = "verify-old" | "enter-new" | "confirm-new";

export function PinChangePage() {
  const navigate = useNavigate();
  const { verifyWithErrorHandling, changeWithErrorHandling } = usePinApi();

  const [currentStep, setCurrentStep] = useState<Step>("verify-old");
  const [oldPin, setOldPin] = useState("");
  const [verifiedOldPin, setVerifiedOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 步骤1：验证旧PIN
  const handleVerifyOldPin = async () => {
    if (oldPin.length !== PIN_CONFIG.LENGTH) {
      toast.error(PIN_MESSAGES.INVALID_LENGTH);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await verifyWithErrorHandling(oldPin, toast);
      setVerifiedOldPin(oldPin);
      setCurrentStep("enter-new");
      setOldPin("");
    } catch (error: unknown) {
      const err = error as PinApiError;
      handlePinApiError(err, toast);
      setOldPin("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 步骤2&3：设置新PIN
  const handleSubmitNewPin = async () => {
    if (newPin.length !== PIN_CONFIG.LENGTH) {
      toast.error(PIN_MESSAGES.INVALID_LENGTH);
      return;
    }
    if (newPin !== confirmPin) {
      toast.error(PIN_MESSAGES.PIN_MISMATCH);
      setConfirmPin("");
      return;
    }
    if (newPin === verifiedOldPin) {
      toast.error(PIN_MESSAGES.PIN_SAME_AS_OLD);
      return;
    }

    setIsSubmitting(true);

    try {
      await changeWithErrorHandling(verifiedOldPin, newPin, toast);
      toast.success(PIN_MESSAGES.CHANGE_SUCCESS, {
        description: PIN_MESSAGES.CHANGE_SUCCESS_DESC,
      });
      setTimeout(() => navigate("/settings", { replace: true }), PIN_CONFIG.NAVIGATION_DELAY);
    } catch (error: unknown) {
      const err = error as PinApiError;
      if (err.code === 401) {
        toast.error("旧 PIN 验证失败", {
          description: "请重新输入",
        });
        setCurrentStep("verify-old");
        setOldPin("");
        setVerifiedOldPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        handlePinApiError(err, toast);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-100">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-apple-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        {/* 标题卡片 */}
        <GlassCard className="!p-6 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/10 flex items-center justify-center">
            {currentStep === "verify-old" ? (
              <Lock className="text-purple-500" size={32} />
            ) : (
              <KeyRound className="text-purple-500" size={32} />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-apple-textMain dark:text-white">
              {currentStep === "verify-old" ? "验证 PIN 码" : "修改 PIN 码"}
            </h1>
            <p className="text-apple-textSec dark:text-white/40 text-sm mt-1">
              {currentStep === "verify-old"
                ? "请输入当前 PIN 码以继续"
                : currentStep === "enter-new"
                  ? "请输入新的 6 位 PIN 码"
                  : "请再次输入新 PIN 码确认"}
            </p>
          </div>
        </GlassCard>

        {/* 步骤1：验证旧PIN */}
        {currentStep === "verify-old" && (
          <GlassCard className="!p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-apple-textMain dark:text-white">
                当前 PIN 码
              </label>
              <PinInput
                value={oldPin}
                onChange={setOldPin}
                showPin={showOldPin}
                onToggleVisibility={() => setShowOldPin(!showOldPin)}
                onSubmit={handleVerifyOldPin}
                disabled={isSubmitting}
              />
              <PinStrengthIndicator pinLength={oldPin.length} />
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleVerifyOldPin}
                disabled={oldPin.length !== PIN_CONFIG.LENGTH || isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <LoadingSpinner text="验证中..." />
                ) : (
                  <span className="flex items-center gap-2">
                    <Shield size={18} />
                    验证 PIN 码
                  </span>
                )}
              </Button>
            </div>
          </GlassCard>
        )}

        {/* 步骤2：输入新PIN */}
        {currentStep === "enter-new" && (
          <GlassCard className="!p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-apple-textMain dark:text-white">
                新 PIN 码
              </label>
              <PinInput
                value={newPin}
                onChange={setNewPin}
                showPin={showNewPin}
                onToggleVisibility={() => setShowNewPin(!showNewPin)}
                onSubmit={() => newPin.length === PIN_CONFIG.LENGTH && setCurrentStep("confirm-new")}
              />
              <PinStrengthIndicator pinLength={newPin.length} />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep("verify-old");
                  setOldPin("");
                  setVerifiedOldPin("");
                  setNewPin("");
                }}
                className="flex-1"
              >
                返回
              </Button>
              <Button
                onClick={() => setCurrentStep("confirm-new")}
                disabled={newPin.length !== PIN_CONFIG.LENGTH}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                下一步
              </Button>
            </div>
          </GlassCard>
        )}

        {/* 步骤3：确认新PIN */}
        {currentStep === "confirm-new" && (
          <GlassCard className="!p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-apple-textMain dark:text-white">
                确认新 PIN 码
              </label>
              <PinInput
                value={confirmPin}
                onChange={setConfirmPin}
                showPin={showConfirmPin}
                onToggleVisibility={() => setShowConfirmPin(!showConfirmPin)}
                onSubmit={handleSubmitNewPin}
                disabled={isSubmitting}
              />
              {confirmPin.length > 0 && (
                <PinMatchIndicator isValid={newPin === confirmPin && confirmPin.length === PIN_CONFIG.LENGTH} />
              )}
            </div>

            {/* 提示信息 */}
            <div className="flex items-start gap-3 p-4 bg-apple-accent/5 dark:bg-purple-500/5 rounded-xl border border-apple-accent/10 dark:border-purple-500/10">
              <Lock className="text-purple-500 shrink-0 mt-0.5" size={16} />
              <div className="text-xs text-apple-textSec dark:text-white/60 space-y-1">
                <p>• PIN 码必须是 {PIN_CONFIG.LENGTH} 位数字</p>
                <p>• 请妥善保管 PIN 码，丢失后无法找回</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStep("enter-new");
                  setConfirmPin("");
                }}
                className="flex-1"
                disabled={isSubmitting}
              >
                返回
              </Button>
              <Button
                onClick={handleSubmitNewPin}
                disabled={newPin !== confirmPin || confirmPin.length !== PIN_CONFIG.LENGTH || isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <LoadingSpinner text="修改中..." />
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
