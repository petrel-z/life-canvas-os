import { useState, useEffect, useRef } from 'react'
import {
  Database,
  X,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  Smartphone,
  ChevronRight,
  Shield,
  KeyRound,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '~/renderer/contexts/AppContext'
import { GlassCard } from '~/renderer/components/GlassCard'
import { Input } from '~/renderer/components/ui/input'
import { Button } from '~/renderer/components/ui/button'
import { Switch } from '~/renderer/components/ui/switch'
import { Slider } from '~/renderer/components/ui/slider'
import { Badge } from '~/renderer/components/ui/badge'
import { TagInput } from '~/renderer/components/ui/tag-input'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/renderer/components/ui/tabs'
import { Label } from '~/renderer/components/ui/label'
import { calculateLifeProgress } from '~/renderer/lib/lifeUtils'
import { useUserApi, type UserProfile } from '~/renderer/hooks/useUserApi'
import { useAiApi, type AIConfigData } from '~/renderer/hooks/useAiApi'
import { useDataApi, type ExportFormat } from '~/renderer/hooks/useDataApi'
import { usePinStatus } from '~/renderer/hooks/usePinStatus'
import { toast } from 'sonner'

export function SettingsPage() {
  const { state, updateState, setTheme } = useApp()
  const { getUserProfile, updateUserProfile } = useUserApi()
  const { getAIConfig, saveAIConfig } = useAiApi()
  const { exportData, importData } = useDataApi()
  const {
    pinStatus,
    isLoading: isPinStatusLoading,
    fetchPinStatus,
    updatePinStatusAfterOperation,
  } = usePinStatus()
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle')
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingAI, setIsSavingAI] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [aiConfigLoaded, setAiConfigLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditingAI, setIsEditingAI] = useState(false) // 是否处于编辑模式
  const [existingAIConfig, setExistingAIConfig] = useState<any>(null) // 已存在的 AI 配置
  const isLoadingProfileRef = useRef(false)
  const getUserProfileRef = useRef(getUserProfile)

  // AI 配置本地状态
  const [aiFormData, setAiFormData] = useState<{
    provider: 'DeepSeek' | 'Doubao'
    apiKey: string
    modelName: string
    frequencyLimit: number
  }>({
    provider: 'DeepSeek',
    apiKey: '',
    modelName: 'deepseek-chat',
    frequencyLimit: 10,
  })

  // 更新 ref
  useEffect(() => {
    getUserProfileRef.current = getUserProfile
  }, [getUserProfile])

  // 表单本地状态
  const [formData, setFormData] = useState({
    name: '',
    birthday: '',
    mbti: '',
    values: [] as string[],
    lifespan: 0,
  })

  // 进入设置页面时加载用户信息
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isLoadingProfileRef.current) return
      isLoadingProfileRef.current = true

      try {
        const profile = await getUserProfileRef.current()
        if (profile) {
          setFormData({
            name: profile.name || '',
            birthday: profile.birthday || '',
            mbti: profile.mbti || '',
            values: profile.values || [],
            lifespan: profile.lifespan || 0,
          })
        }
      } catch (_error) {
        console.log('User profile not set yet')
      } finally {
        isLoadingProfileRef.current = false
      }
    }

    loadUserProfile()
  }, [])

  const lifeProgress = calculateLifeProgress(
    formData.birthday,
    formData.lifespan
  )

  // 按 Tab 加载对应的接口
  useEffect(() => {
    const loadTabData = async () => {
      // AI 配置 - 只在首次切换到该 tab 时加载
      if (activeTab === 'ai' && !aiConfigLoaded) {
        try {
          const config = await getAIConfig()
          if (config) {
            // 保存完整的配置信息
            setExistingAIConfig(config)

            setAiFormData({
              provider: config.provider === 'deepseek' ? 'DeepSeek' : 'Doubao',
              apiKey: '', // 不显示完整的 API Key
              modelName: config.model_name || 'deepseek-chat',
              frequencyLimit: state.aiConfig.frequencyLimit || 10,
            })
            // 更新全局状态
            updateState({
              aiConfig: {
                ...state.aiConfig,
                provider:
                  config.provider === 'deepseek' ? 'DeepSeek' : 'Doubao',
                modelName: config.model_name || 'deepseek-chat',
                apiKey: state.aiConfig.apiKey, // 保留原有的 API Key
              },
            })
          } else {
            // 没有配置
            setExistingAIConfig(null)
          }
          setAiConfigLoaded(true)
        } catch (_error) {
          console.log('AI config not set yet')
          setExistingAIConfig(null)
          setAiConfigLoaded(true)
        }
      }

      // 数据管理 - 只在首次切换到该 tab 时加载 PIN 状态（使用缓存）
      if (activeTab === 'security') {
        try {
          await fetchPinStatus()
        } catch (error) {
          console.error('Failed to load PIN status:', error)
        }
      }
    }

    loadTabData()
  }, [activeTab, aiConfigLoaded])

  const handleTestAI = async () => {
    if (!aiFormData.apiKey && !state.aiConfig.apiKey) {
      toast.error('请先输入 API 密钥')
      return
    }

    setTestStatus('testing')

    try {
      // 模拟测试，实际应该调用 AI API
      setTimeout(() => {
        const apiKeyToTest = aiFormData.apiKey || state.aiConfig.apiKey
        setTestStatus(apiKeyToTest ? 'success' : 'error')
        if (apiKeyToTest) {
          toast.success('AI 配置测试成功')
        } else {
          toast.error('AI 配置测试失败，请检查 API Key')
        }
        setTimeout(() => setTestStatus('idle'), 3000)
      }, 1500)
    } catch (_error) {
      setTestStatus('error')
      setTimeout(() => setTestStatus('idle'), 3000)
    }
  }

  const handleSaveAIConfig = async () => {
    setIsSavingAI(true)

    try {
      const configData: AIConfigData = {
        provider: aiFormData.provider,
        apiKey: aiFormData.apiKey || state.aiConfig.apiKey,
        modelName: aiFormData.modelName,
      }

      const result = await saveAIConfig(configData)

      // 保存成功后，重新加载配置
      const updatedConfig = await getAIConfig()
      setExistingAIConfig(updatedConfig)

      // 更新全局状态
      updateState({
        aiConfig: {
          ...state.aiConfig,
          provider: aiFormData.provider,
          modelName: result.model_name,
          apiKey: configData.apiKey,
          frequencyLimit: aiFormData.frequencyLimit,
        },
      })

      // 清空 API Key 输入框（因为已保存）
      setAiFormData({
        ...aiFormData,
        apiKey: '',
      })

      // 退出编辑模式
      setIsEditingAI(false)
    } catch (error) {
      console.error('Failed to save AI config:', error)
    } finally {
      setIsSavingAI(false)
    }
  }

  // 进入编辑模式
  const handleEditAI = () => {
    setIsEditingAI(true)
  }

  // 取消编辑
  const handleCancelEditAI = () => {
    setIsEditingAI(false)
    setAiFormData({
      ...aiFormData,
      apiKey: '',
    })
  }

  const handleSaveProfile = async () => {
    // 表单校验
    if (!formData.name || formData.name.trim() === '') {
      toast.error('请输入显示名称')
      return
    }

    if (!formData.birthday || formData.birthday.trim() === '') {
      toast.error('请选择出生日期')
      return
    }

    if (!formData.mbti || formData.mbti.trim() === '') {
      toast.error('请输入 MBTI 类型')
      return
    }

    if (formData.mbti.length !== 4) {
      toast.error('MBTI 类型必须为 4 个字母（例如：INTJ）')
      return
    }

    if (!formData.lifespan) {
      toast.error('请输入预期寿命')
      return
    }

    setIsSaving(true)
    try {
      const profileData: UserProfile = {
        name: formData.name,
        birthday: formData.birthday,
        mbti: formData.mbti,
        values: formData.values,
        lifespan: formData.lifespan,
      }

      const result = await updateUserProfile(profileData)

      // 保存成功后，更新全局 state
      updateState({
        user: {
          name: result.name || '',
          birthday: result.birthday || '',
          mbti: result.mbti || '',
          values: result.values || [],
          lifespan: result.lifespan || 0,
        },
      })
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearData = () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      localStorage.removeItem('life-canvas-state')
      window.location.reload()
    }
  }

  const handleExportClick = () => {
    setShowExportDialog(true)
  }

  const handleExportFormatSelect = async (format: ExportFormat) => {
    setIsExporting(true)
    setShowExportDialog(false)

    try {
      await exportData(format)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = async () => {
    setIsImporting(true)
    try {
      await importData()
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className=" space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="space-y-1">
        {/* <h1 className="text-3xl font-black text-apple-textMain dark:text-white tracking-tight flex items-center gap-3">
          <Monitor className="text-apple-accent" />
          系统设置
        </h1> */}
        <p className="text-apple-textSec dark:text-white/40 text-base">
          管理您的生命画布环境变量与系统偏好。
        </p>
      </header>

      <Tabs
        className="space-y-8"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="bg-apple-bg2 dark:bg-white/5 border border-apple-border dark:border-white/10">
          <TabsTrigger value="profile">个人档案</TabsTrigger>
          <TabsTrigger value="ai">AI 配置</TabsTrigger>
          <TabsTrigger value="appearance">外观设置</TabsTrigger>
          <TabsTrigger value="security">数据管理</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-5" value="profile">
          <GlassCard className="!p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <Label
                  className="text-base font-semibold"
                  htmlFor="display-name"
                >
                  显示名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="h-11"
                  id="display-name"
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="您的姓名"
                  type="text"
                  value={formData.name}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold" htmlFor="birthday">
                  出生日期 <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="h-11"
                  id="birthday"
                  onChange={e =>
                    setFormData({ ...formData, birthday: e.target.value })
                  }
                  type="date"
                  value={formData.birthday}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-3">
                <Label className="text-base font-semibold" htmlFor="mbti">
                  MBTI 类型 <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="h-11"
                  id="mbti"
                  maxLength={4}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      mbti: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="例如 INTJ"
                  type="text"
                  value={formData.mbti}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold" htmlFor="lifespan">
                  预期寿命 (岁) <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="h-11"
                  id="lifespan"
                  max={120}
                  min={50}
                  onChange={e => {
                    const value = parseInt(e.target.value, 10)
                    // 限制输入范围在50-120之间
                    if (Number.isNaN(value) || value < 50) {
                      setFormData({ ...formData, lifespan: 50 })
                    } else if (value > 120) {
                      setFormData({ ...formData, lifespan: 120 })
                    } else {
                      setFormData({ ...formData, lifespan: value })
                    }
                  }}
                  placeholder="请输入预期寿命（50-120岁）"
                  step={1}
                  type="number"
                  value={formData.lifespan || ''}
                />
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <Label className="text-base font-semibold">核心价值观</Label>
              <TagInput
                onChange={values => setFormData({ ...formData, values })}
                placeholder="按回车添加..."
                value={formData.values}
              />
            </div>

            <div className="pt-6 border-t border-apple-border dark:border-white/5 space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-apple-textSec dark:text-white/60">
                  实时生命进度
                </span>
                <span className="text-2xl font-black text-apple-textMain dark:text-white">
                  {lifeProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-apple-bg2 dark:bg-white/5 h-2 rounded-full overflow-hidden border border-apple-border dark:border-none">
                <div
                  className="bg-gradient-to-r from-apple-accent to-indigo-500 h-full transition-all duration-1000 shadow-[0_0_12px_rgba(10,132,255,0.2)]"
                  style={{ width: `${lifeProgress}%` }}
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button
                className="bg-apple-accent hover:bg-apple-accent/90"
                disabled={isSaving}
                onClick={handleSaveProfile}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    保存中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2" size={18} />
                    保存用户信息
                  </>
                )}
              </Button>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent className="space-y-5" value="ai">
          <GlassCard className="space-y-10 !p-8">
            {/* 未配置或编辑模式 */}
            {!existingAIConfig || isEditingAI ? (
              <>
                <div className="space-y-3 mb-8">
                  <Label className="text-base font-semibold">模型供应商</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {(['DeepSeek', 'Doubao'] as const).map(p => (
                      <Button
                        className={
                          aiFormData.provider === p
                            ? 'bg-apple-accent hover:bg-apple-accent/90 h-12 text-base'
                            : 'h-12 text-base'
                        }
                        disabled={!isEditingAI && existingAIConfig !== null}
                        key={p}
                        onClick={() =>
                          setAiFormData({ ...aiFormData, provider: p })
                        }
                        variant={
                          aiFormData.provider === p ? 'default' : 'outline'
                        }
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <Label className="text-base font-semibold" htmlFor="api-key">
                    API 密钥 (加密存储)
                  </Label>
                  <div className="relative flex gap-3">
                    <Input
                      className="flex-1 h-11"
                      disabled={!isEditingAI && existingAIConfig !== null}
                      id="api-key"
                      onChange={e =>
                        setAiFormData({ ...aiFormData, apiKey: e.target.value })
                      }
                      placeholder={
                        existingAIConfig && !isEditingAI
                          ? '********'
                          : '请输入您的 API Key'
                      }
                      type="password"
                      value={aiFormData.apiKey}
                    />
                    {(isEditingAI || !existingAIConfig) && (
                      <Button
                        className="shrink-0 h-11 w-11"
                        disabled={
                          testStatus === 'testing' || !aiFormData.apiKey
                        }
                        onClick={handleTestAI}
                        size="icon"
                        variant="outline"
                      >
                        {testStatus === 'idle' && <RefreshCw size={18} />}
                        {testStatus === 'testing' && (
                          <RefreshCw className="animate-spin" size={18} />
                        )}
                        {testStatus === 'success' && (
                          <CheckCircle2 className="text-green-500" size={18} />
                        )}
                        {testStatus === 'error' && (
                          <X className="text-destructive" size={18} />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">
                      日生成上限
                    </Label>
                    <Badge
                      className="text-apple-accent bg-apple-accent/10 text-sm px-3 py-1"
                      variant="secondary"
                    >
                      {aiFormData.frequencyLimit} 次/日
                    </Badge>
                  </div>
                  <Slider
                    className="pt-2"
                    disabled={!isEditingAI && existingAIConfig !== null}
                    max={50}
                    min={1}
                    onValueChange={([value]) =>
                      setAiFormData({ ...aiFormData, frequencyLimit: value })
                    }
                    step={1}
                    value={[aiFormData.frequencyLimit]}
                  />
                  <div className="flex justify-between text-xs text-apple-textTer dark:text-white/30">
                    <span>极简</span>
                    <span>深度</span>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  {isEditingAI && (
                    <Button
                      disabled={isSavingAI}
                      onClick={handleCancelEditAI}
                      variant="outline"
                    >
                      取消
                    </Button>
                  )}
                  <Button
                    className="bg-apple-accent hover:bg-apple-accent/90"
                    disabled={
                      isSavingAI || (!isEditingAI && existingAIConfig !== null)
                    }
                    onClick={handleSaveAIConfig}
                  >
                    {isSavingAI ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" size={18} />
                        保存中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2" size={18} />
                        {existingAIConfig && !isEditingAI
                          ? '已配置'
                          : '保存 AI 配置'}
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              /* 已配置，展示模式 */
              <div className="space-y-8">
                <div className="flex items-center gap-3 p-4 bg-apple-accent/5 rounded-xl border border-apple-accent/20">
                  <div className="p-3 rounded-full bg-apple-accent/10">
                    <KeyRound className="w-6 h-6 text-apple-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-apple-textSec dark:text-white/60 mb-1">
                      {existingAIConfig.provider === 'deepseek'
                        ? 'DeepSeek'
                        : 'Doubao'}{' '}
                      · {existingAIConfig.model_name}
                    </div>
                    <div className="text-lg font-mono font-semibold text-apple-textMain dark:text-white">
                      {'sk-******************************************'}
                    </div>
                  </div>
                  <Button
                    className="gap-2"
                    onClick={handleEditAI}
                    variant="outline"
                  >
                    修改 AI 配置
                  </Button>
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">
                      日生成上限
                    </Label>
                    <Badge
                      className="text-apple-accent bg-apple-accent/10 text-sm px-3 py-1"
                      variant="secondary"
                    >
                      {aiFormData.frequencyLimit} 次/日
                    </Badge>
                  </div>
                  <Slider
                    className="pt-2"
                    max={50}
                    min={1}
                    onValueChange={([value]) =>
                      setAiFormData({ ...aiFormData, frequencyLimit: value })
                    }
                    step={1}
                    value={[aiFormData.frequencyLimit]}
                  />
                  <div className="flex justify-between text-xs text-apple-textTer dark:text-white/30">
                    <span>极简</span>
                    <span>深度</span>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent className="space-y-5" value="appearance">
          <GlassCard className="space-y-10 !p-8">
            <div className="space-y-4">
              <Label className="text-base font-semibold">外观模式</Label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'light' as const, label: '浅色', icon: Sun },
                  { id: 'dark' as const, label: '深色', icon: Moon },
                  { id: 'auto' as const, label: '跟随系统', icon: Smartphone },
                ].map(t => (
                  <Button
                    className={`flex flex-col gap-2 h-24 ${
                      state.theme === t.id
                        ? 'bg-apple-accent hover:bg-apple-accent/90'
                        : ''
                    }`}
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    variant={state.theme === t.id ? 'default' : 'outline'}
                  >
                    <t.icon size={24} />
                    <span className="text-sm">{t.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 bg-apple-bg2 dark:bg-white/5 rounded-xl border border-apple-border dark:border-white/5">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-apple-textMain dark:text-white">
                    系统通知
                  </div>
                  <div className="text-xs text-apple-textSec dark:text-white/30">
                    在桌面端发送记录提醒
                  </div>
                </div>
                <Switch
                  checked={state.systemConfig.notificationsEnabled}
                  onCheckedChange={checked =>
                    updateState({
                      systemConfig: {
                        ...state.systemConfig,
                        notificationsEnabled: checked,
                      },
                    })
                  }
                />
              </div>

              {/* <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    自动保存间隔
                  </Label>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {state.systemConfig.autoSaveInterval}s
                  </Badge>
                </div>
                <Slider
                  value={[state.systemConfig.autoSaveInterval]}
                  onValueChange={([value]) =>
                    updateState({
                      systemConfig: {
                        ...state.systemConfig,
                        autoSaveInterval: value,
                      },
                    })
                  }
                  min={30}
                  max={300}
                  step={30}
                  className="pt-2"
                />
              </div> */}
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent className="space-y-5" value="security">
          {/* PIN 设置提醒 */}
          {pinStatus && !pinStatus.has_pin_set && (
            <GlassCard className="!p-6 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border-purple-500/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                  <Shield size={24} />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-base font-semibold text-apple-textMain dark:text-white">
                      设置 PIN 码保护私密日记
                    </div>
                    <div className="text-sm text-apple-textSec dark:text-white/50 mt-1">
                      您还没有设置 PIN
                      码。设置后，您可以将日记标记为私密，只有通过 PIN
                      验证才能查看。
                    </div>
                  </div>
                  <Link to="/settings/pin">
                    <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                      立即设置 PIN 码
                    </Button>
                  </Link>
                </div>
              </div>
            </GlassCard>
          )}

          {/* PIN 管理 - 已设置时显示 */}
          {pinStatus?.has_pin_set && (
            <GlassCard className="space-y-4 !p-8">
              <div className="flex items-center gap-3 pb-4 border-b border-apple-border dark:border-white/5">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Shield className="text-purple-500" size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-apple-textMain dark:text-white">
                    PIN 码管理
                  </div>
                  <div className="text-xs text-apple-textSec dark:text-white/40">
                    管理您的私密日记保护设置
                  </div>
                </div>
              </div>

              <Link className="block" to="/settings/pin/change">
                <Button
                  className="w-full justify-start h-auto py-4 px-5"
                  variant="outline"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/5 text-purple-500">
                      <KeyRound size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold">修改 PIN 码</div>
                      <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                        更改您的私密日记保护密码
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className="ml-auto text-apple-textTer shrink-0"
                    size={16}
                  />
                </Button>
              </Link>

              <Link className="block" to="/settings/pin/delete">
                <Button
                  className="w-full justify-start h-auto py-4 px-5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                  variant="outline"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-destructive/5 text-destructive">
                      <AlertTriangle size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold">删除 PIN 码</div>
                      <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                        移除私密日记保护
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className="ml-auto text-apple-textTer shrink-0"
                    size={16}
                  />
                </Button>
              </Link>
            </GlassCard>
          )}

          <GlassCard className="space-y-4 !p-8">
            <Button
              className="w-full justify-start h-auto py-5 px-5"
              disabled={isExporting}
              onClick={handleExportClick}
              variant="outline"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-apple-accent/5 text-apple-accent">
                  {isExporting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Download size={20} />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">导出备份数据</div>
                  <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                    导出完整的生命足迹数据（支持 JSON/ZIP）
                  </div>
                </div>
              </div>
              <ChevronRight
                className="ml-auto text-apple-textTer shrink-0"
                size={16}
              />
            </Button>

            <Button
              className="w-full justify-start h-auto py-5 px-5"
              disabled={isImporting}
              onClick={handleImportClick}
              variant="outline"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/5 text-green-500">
                  {isImporting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Upload size={20} />
                  )}
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">导入历史数据</div>
                  <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                    从备份文件中恢复记录（支持 JSON/ZIP）
                  </div>
                </div>
              </div>
              <ChevronRight
                className="ml-auto text-apple-textTer shrink-0"
                size={16}
              />
            </Button>

            <Button
              className="w-full justify-start h-auto py-5 px-5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              onClick={handleClearData}
              variant="outline"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/5 text-destructive">
                  <Trash2 size={20} />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold">清除系统数据</div>
                  <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                    删除所有本地记录并重置系统
                  </div>
                </div>
              </div>
              <ChevronRight
                className="ml-auto text-apple-textTer shrink-0"
                size={16}
              />
            </Button>
          </GlassCard>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col items-center gap-2 pt-10">
        <div className="flex items-center gap-2 text-apple-textTer dark:text-white/10 text-[10px] font-black uppercase tracking-[0.4em]">
          Life Canvas OS • End-to-End Encryption
        </div>
        <div className="text-[9px] text-apple-textTer dark:text-white/5 font-medium uppercase tracking-[0.1em]">
          Copyright © 2025 Creative Canvas Labs. All Rights Reserved.
        </div>
      </div>

      {/* 导出格式选择弹窗 */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="!p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-apple-textMain dark:text-white mb-2">
              选择导出格式
            </h3>
            <p className="text-sm text-apple-textSec dark:text-white/50 mb-6">
              请选择您希望导出的数据格式
            </p>

            <div className="space-y-3">
              <Button
                className="w-full justify-start h-auto py-4 px-5"
                onClick={() => handleExportFormatSelect('json')}
                variant="outline"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Database size={20} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-semibold">JSON 格式</div>
                    <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                      文本格式，易于阅读和编辑
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                className="w-full justify-start h-auto py-4 px-5"
                onClick={() => handleExportFormatSelect('zip')}
                variant="outline"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    <Download size={20} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-semibold">ZIP 格式</div>
                    <div className="text-xs text-apple-textSec dark:text-white/30 mt-0.5">
                      压缩格式，包含数据库文件和附件
                    </div>
                  </div>
                </div>
              </Button>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setShowExportDialog(false)}
                variant="ghost"
              >
                取消
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
