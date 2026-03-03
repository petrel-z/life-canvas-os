import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "~/renderer/lib/toast";
import {
  PIN_CONFIG,
  PIN_MESSAGES,
  type PinApiError,
} from "~/renderer/lib/pin";
import { usePinApi } from "~/renderer/hooks";
import { usePinStatus } from "~/renderer/hooks/usePinStatus";
import { PinLockScreen } from "~/renderer/components/auth/PinLockScreen";

type Step = 'verify-old' | 'enter-new' | 'confirm-new'

export function PinChangePage() {
  const navigate = useNavigate()
  const { verifyWithErrorHandling, changeWithErrorHandling } = usePinApi()
  const { updatePinStatusAfterOperation } = usePinStatus()

  const [currentStep, setCurrentStep] = useState<Step>("verify-old");
  const [verifiedOldPin, setVerifiedOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlockError, setUnlockError] = useState<string | undefined>(undefined);

  // 步骤1：验证旧PIN
  const handleVerifyOldPin = async (pin: string) => {
    setUnlockError(undefined);
    setIsSubmitting(true);

    try {
      await verifyWithErrorHandling(pin, toast);
      setVerifiedOldPin(pin);
      setCurrentStep("enter-new");
    } catch (error: unknown) {
      const err = error as PinApiError;
      setUnlockError('密码验证失败');
    } finally {
      setIsSubmitting(false)
    }
  }

  // 步骤2：输入新PIN
  const handleEnterNewPin = async (pin: string) => {
    setUnlockError(undefined);
    if (pin === verifiedOldPin) {
      setUnlockError(PIN_MESSAGES.PIN_SAME_AS_OLD);
      return;
    }
    setNewPin(pin);
    setCurrentStep("confirm-new");
  };

  // 步骤3：确认新PIN
  const handleConfirmNewPin = async (confirmPin: string) => {
    setUnlockError(undefined);

    if (confirmPin !== newPin) {
      setUnlockError(PIN_MESSAGES.PIN_MISMATCH);
      setCurrentStep("enter-new");
      setNewPin("");
      return;
    }

    setIsSubmitting(true)

    try {
      await changeWithErrorHandling(verifiedOldPin, confirmPin, toast);

      // 更新 PIN 状态缓存
      await updatePinStatusAfterOperation()

      toast.success(PIN_MESSAGES.CHANGE_SUCCESS, {
        description: PIN_MESSAGES.CHANGE_SUCCESS_DESC,
      })
      setTimeout(
        () => navigate('/settings', { replace: true }),
        PIN_CONFIG.NAVIGATION_DELAY
      )
    } catch (error: unknown) {
      const err = error as PinApiError
      if (err.code === 401) {
        setUnlockError("密码验证失败，请重新输入");
        setCurrentStep("verify-old");
        setVerifiedOldPin("");
        setNewPin("");
      } else {
        setUnlockError('密码修改失败');
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 步骤1：验证旧PIN
  if (currentStep === "verify-old") {
    return (
      <PinLockScreen
        title="验证 PIN 码"
        description="请输入当前密码以继续修改密码"
        unlockButtonText="验证"
        unlockingText="验证中..."
        showCancelButton={true}
        cancelButtonText="取消"
        onCancel={() => {
          navigate("/settings");
          setUnlockError(undefined);
        }}
        error={unlockError}
        onUnlock={handleVerifyOldPin}
      />
    );
  }

  // 步骤2：输入新PIN
  if (currentStep === "enter-new") {
    return (
      <PinLockScreen
        title="输入新密码"
        description="请输入新的密码"
        unlockButtonText="下一步"
        unlockingText="验证中..."
        showCancelButton={true}
        cancelButtonText="返回"
        onCancel={() => {
          setCurrentStep("verify-old");
          setUnlockError(undefined);
        }}
        error={unlockError}
        onUnlock={handleEnterNewPin}
      />
    );
  }

  // 步骤3：确认新PIN
  return (
    <PinLockScreen
      title="确认新密码"
      description="请再次输入新密码以确认"
      unlockButtonText="确认修改"
      unlockingText="修改中..."
      showCancelButton={true}
      cancelButtonText="返回"
      onCancel={() => {
        setCurrentStep("enter-new");
        setUnlockError(undefined);
      }}
      error={unlockError}
      onUnlock={handleConfirmNewPin}
    />
  );
}
