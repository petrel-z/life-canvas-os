/**
 * 用户设置管理 Hook
 */

import { useState, useCallback } from 'react'
import { userApi, type UserSettings } from '~/renderer/api/user'
import { toast } from '~/renderer/lib/toast'
import { usePinStatus } from './usePinStatus'

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { refreshPinStatus } = usePinStatus()

  /**
   * 获取用户设置
   */
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await userApi.getSettings()

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail?.message || '获取用户设置失败')
      }

      const result = await response.json()
      const settingsData = result.data as UserSettings

      setSettings(settingsData)
      return settingsData
    } catch (err) {
      console.error('Failed to fetch user settings:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 更新用户设置
   */
  const updateSettings = useCallback(
    async (data: Partial<UserSettings>) => {
      try {
        setIsLoading(true)
        const response = await userApi.updateSettings(data)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail?.message || '更新用户设置失败')
        }

        // 更新本地缓存
        if (settings) {
          setSettings({ ...settings, ...data })
        }

        toast.success('设置保存成功')
        return true
      } catch (err) {
        console.error('Failed to update user settings:', err)
        toast.error('更新设置失败', {
          description: err instanceof Error ? err.message : '请稍后重试',
        })
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [settings]
  )

  /**
   * 获取 PIN 验证开关状态
   */
  const getPinVerifySwitch = useCallback(
    (
      key:
        | 'pin_verify_on_startup'
        | 'pin_verify_for_private_journal'
        | 'pin_verify_for_data_export'
        | 'pin_verify_for_settings_change'
    ): boolean => {
      return settings?.[key] ?? true
    },
    [settings]
  )

  /**
   * 更新 PIN 验证开关（同时刷新 PIN 状态缓存）
   */
  const updatePinVerifySwitch = useCallback(
    async (
      key:
        | 'pin_verify_on_startup'
        | 'pin_verify_for_private_journal'
        | 'pin_verify_for_data_export'
        | 'pin_verify_for_settings_change',
      value: boolean
    ) => {
      const success = await updateSettings({ [key]: value })
      // 刷新 PIN 状态缓存，确保各个页面获取到最新的验证要求
      if (success) {
        await refreshPinStatus()
      }
      return success
    },
    [updateSettings, refreshPinStatus]
  )

  return {
    settings,
    isLoading,
    fetchSettings,
    updateSettings,
    getPinVerifySwitch,
    updatePinVerifySwitch,
  }
}
