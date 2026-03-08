import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { GlassCard } from '~/renderer/components/GlassCard'
import { Button } from '~/renderer/components/ui/button'
import { toast } from '~/renderer/lib/toast'
import { pinApi } from '~/renderer/api'
import { PIN_CONFIG } from '~/renderer/lib/pin'
import { usePinStatus } from '~/renderer/hooks/usePinStatus'
import { PinLockScreen } from '~/renderer/components/auth/PinLockScreen'
import type { PinApiError } from '~/renderer/lib/pin'

type Step = 'enter-pin' | 'confirm-pin'

export function PinSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { updatePinStatusAfterOperation } = usePinStatus()

  const [currentStep, setCurrentStep] = useState<Step>('enter-pin')
  const [firstPin, setFirstPin] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unlockError, setUnlockError] = useState<string | undefined>(undefined)

  // 获取返回 URL
  const returnUrl = (location.state as any)?.returnUrl || '/journal'

  // 第一步：输入PIN码
  const handleEnterPin = async (pin: string) => {
    setUnlockError(undefined)
    setFirstPin(pin)
    setCurrentStep('confirm-pin')
  }

  // 第二步：确认PIN码
  const handleConfirmPin = async (confirmPin: string) => {
    setUnlockError(undefined)

    if (confirmPin !== firstPin) {
      toast.error('两次输入的 PIN 不一致', {
        description: '请重新输入',
      })
      setFirstPin('')
      setCurrentStep('enter-pin')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await pinApi.setup(confirmPin)

      if (!response.ok) {
        const error = (await response.json()) as PinApiError

        if (error.code === 409) {
          setUnlockError('您已经设置过 PIN 码了')
        } else {
          setUnlockError(error.message || 'PIN 设置失败')
        }
        setFirstPin('')
        setCurrentStep('enter-pin')
        return
      }

      // 标记为非首次启动
      localStorage.setItem('life-canvas-first-launch', 'false')

      // 更新 PIN 状态缓存
      await updatePinStatusAfterOperation()

      toast.success('PIN 设置成功', {
        description: '您现在可以使用私密日记功能了',
      })
      // 返回原页面
      setTimeout(
        () => navigate(returnUrl, { replace: true }),
        PIN_CONFIG.NAVIGATION_DELAY
      )
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : 'PIN 设置失败')
      setFirstPin('')
      setCurrentStep('enter-pin')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(returnUrl)
  }

  // 第一步：输入PIN码
  if (currentStep === 'enter-pin') {
    return (
      <PinLockScreen
        cancelButtonText="取消"
        description="请输入 6 位数字 PIN 码以保护您的私密日记"
        error={unlockError}
        initialPin=""
        key="enter-pin"
        onCancel={() => {
          handleCancel()
          setUnlockError(undefined)
        }}
        onUnlock={handleEnterPin}
        showCancelButton={true}
        title="设置 PIN 码"
        unlockButtonText="下一步"
        unlockingText="验证中..."
      />
    )
  }

  // 第二步：确认PIN码
  return (
    <PinLockScreen
      cancelButtonText="返回"
      description="请再次输入 PIN 码以确认"
      error={unlockError}
      key="confirm-pin"
      onCancel={() => {
        setCurrentStep('enter-pin')
        setUnlockError(undefined)
      }}
      onUnlock={handleConfirmPin}
      showCancelButton={true}
      title="确认 PIN 码"
      unlockButtonText="确认设置"
      unlockingText="设置中..."
    />
  )
}
