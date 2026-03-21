import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FileText,
  Plus,
  Search,
  Lock,
  ChevronRight,
  ChevronDown,
  X,
  LockKeyhole,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '~/renderer/components/ui/button'
import { Badge } from '~/renderer/components/ui/badge'
import { Switch } from '~/renderer/components/ui/switch'
import { TagInput } from '~/renderer/components/ui/tag-input'
import { MoodSelector } from '~/renderer/components/ui/mood-selector'
import { Input } from '~/renderer/components/ui/input'
import { MOODS, DIMENSIONS, type MoodType } from '~/renderer/lib/constants'
import { formatDateTimeCN, formatDateCN } from '~/renderer/lib/dateUtils'
import type { DimensionType, JournalEntry } from '~/shared/types'
import { useJournalApi } from '~/renderer/hooks/useJournalApi'
import { cn } from '~/renderer/lib/utils'
import { TiptapEditor } from '~/renderer/components/editor/TiptapEditor'
import { toast } from '~/renderer/lib/toast'
import { PinLockScreen } from '~/renderer/components/auth/PinLockScreen'
import { usePinStatus } from '~/renderer/hooks/usePinStatus'
import { usePinApi } from '~/renderer/hooks'
import { GlassCard } from '~/renderer/components/GlassCard'
import { useAgentEvents, AgentEvents } from '~/renderer/hooks/useAgentEvents'
import { getEventBus } from '~/renderer/lib/event-bus'

const PAGE_SIZE = 50
const AUTO_SAVE_DELAY = 1000 // 自动保存延迟（毫秒）

interface GroupedJournal {
  [key: string]: JournalEntry[]
}

export function JournalPage() {
  const navigate = useNavigate()
  const { listJournals, createJournal, getJournal, updateJournal } =
    useJournalApi()
  const { pinStatus, fetchPinStatus } = usePinStatus()
  const { verifyPin } = usePinApi()

  // 状态管理
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(
    null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saving' | 'saved'>(
    'unsaved'
  )

  // 选中的日记数据
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(
    null
  )
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editMood, setEditMood] = useState<MoodType>('good')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editDimensions, setEditDimensions] = useState<DimensionType[]>([])
  const [editIsPrivate, setEditIsPrivate] = useState(false)

  // PIN 验证相关
  const [needsPinVerify, setNeedsPinVerify] = useState(false)
  const [verifyJournalId, setVerifyJournalId] = useState<string | null>(null)
  const [unlockError, setUnlockError] = useState<string | undefined>()

  // PIN 设置提示弹窗
  const [showPinSetupDialog, setShowPinSetupDialog] = useState(false)

  // 展开/收起状态 - 记录哪些日期是展开的
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // 自动保存相关
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(false)
  const saveNeededRef = useRef(false) // 标记是否有待保存的更改

  // 使用 ref 存储最新的保存数据，避免闭包问题
  const saveDataRef = useRef<{
    title: string
    content: string
    mood: MoodType
    tags: string[]
    linkedDimensions: DimensionType[]
    isPrivate: boolean
  } | null>(null)

  // 加载日记列表
  const loadJournals = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      setIsLoading(true)
      // 获取 PIN 状态
      await fetchPinStatus()
      const result = await listJournals({ page: 1, page_size: PAGE_SIZE })
      setJournals(result.items)
      // 默认展开所有日期
      const dates = new Set(
        result.items.map(item => formatDateCN(item.timestamp))
      )
      setExpandedDates(dates)
    } catch (error) {
      console.error('Failed to load journals:', error)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [listJournals, fetchPinStatus])

  // 监听日记创建事件，触发刷新
  useEffect(() => {
    const handleJournalCreated = () => {
      console.log('Journal created event received, refreshing list...')
      loadJournals()
    }

    const handleJournalUpdated = () => {
      console.log('Journal updated event received, refreshing list...')
      loadJournals()
    }

    const handleJournalDeleted = () => {
      console.log('Journal deleted event received, refreshing list...')
      loadJournals()
    }

    const eventBus = getEventBus()
    const unsubscribeCreate = eventBus.on(
      AgentEvents.JOURNAL_CREATED,
      handleJournalCreated
    )
    const unsubscribeUpdate = eventBus.on(
      AgentEvents.JOURNAL_UPDATED,
      handleJournalUpdated
    )
    const unsubscribeDelete = eventBus.on(
      AgentEvents.JOURNAL_DELETED,
      handleJournalDeleted
    )

    return () => {
      unsubscribeCreate()
      unsubscribeUpdate()
      unsubscribeDelete()
    }
  }, [loadJournals])

  // 切换日期的展开/收起状态
  const toggleDateExpand = useCallback((date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }, [])

  useEffect(() => {
    loadJournals()
  }, [loadJournals])

  // 加载日记详情
  const loadJournalDetail = async (id: string) => {
    // 如果有未保存的更改，先保存当前日记
    if (saveNeededRef.current && selectedJournalId) {
      await doSaveJournal(selectedJournalId, true)
    }

    // 清除之前的选中状态，确保每次都是新的选择
    setSelectedJournal(null)
    setSelectedJournalId(null)

    try {
      const journal = await getJournal(id)

      // 检查是否需要 PIN 验证（每次查看私密日记都需要验证）
      // 需要同时满足：日记是私密的 + 已设置 PIN + 开启了私密日记验证开关
      if (
        journal.isPrivate &&
        pinStatus?.has_pin &&
        pinStatus?.requirements?.private_journal
      ) {
        // 需要验证 PIN
        setVerifyJournalId(id)
        setNeedsPinVerify(true)
        setUnlockError(undefined)
        return
      }

      // 非私密日记或没有 PIN 码，直接加载
      setSelectedJournal(journal)
      setSelectedJournalId(id)
      setEditTitle(journal.title || '未命名')
      setEditContent(journal.content)
      setEditMood(journal.mood || 'good')
      setEditTags(journal.tags || [])
      setEditDimensions(journal.linkedDimensions || [])
      setEditIsPrivate(journal.isPrivate || false)
      setHasUnsavedChanges(false)
      setSaveStatus('unsaved')
      saveNeededRef.current = false
      saveDataRef.current = null
    } catch (error) {
      console.error('Failed to load journal detail:', error)
    }
  }

  // 创建新日记
  const handleCreateJournal = async () => {
    // 如果有未保存的更改，先保存当前日记
    if (saveNeededRef.current && selectedJournalId) {
      await doSaveJournal(selectedJournalId, true)
    }

    try {
      setIsSaving(true)
      const entry = {
        title: '未命名',
        content: '暂无',
        mood: 'good' as MoodType,
        tags: [],
        linkedDimensions: [],
        isPrivate: false,
      }

      const created = await createJournal(entry)
      setJournals(prev => [created, ...prev])
      setSelectedJournal(created)
      setSelectedJournalId(created.id)
      setEditTitle(created.title || '未命名')
      setEditContent(created.content)
      setEditMood(created.mood || 'good')
      setEditTags(created.tags || [])
      setEditDimensions(created.linkedDimensions || [])
      setEditIsPrivate(created.isPrivate || false)
      setHasUnsavedChanges(false)
      setSaveStatus('unsaved')
      saveNeededRef.current = false
      saveDataRef.current = null
      toast.success('日记已创建，开始编辑吧')
    } catch (error) {
      console.error('Failed to create journal:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 实际执行保存的函数
  const doSaveJournal = async (id: string, silent = false) => {
    // 使用 saveDataRef 中的数据，如果没有则使用当前 state
    const dataToSave = saveDataRef.current || {
      title: editTitle,
      content: editContent,
      mood: editMood,
      tags: editTags,
      linkedDimensions: editDimensions,
      isPrivate: editIsPrivate,
    }

    try {
      setIsSaving(true)
      setSaveStatus('saving')
      const entry = {
        title: dataToSave.title.trim() || '未命名',
        content: dataToSave.content,
        mood: dataToSave.mood,
        tags: dataToSave.tags,
        linkedDimensions: dataToSave.linkedDimensions,
        isPrivate: dataToSave.isPrivate,
      }

      const updated = await updateJournal(id, entry)

      // 更新列表中的该项
      setJournals(prev => prev.map(j => (j.id === id ? updated : j)))
      setSelectedJournal(updated)

      setHasUnsavedChanges(false)
      saveNeededRef.current = false
      saveDataRef.current = null
      setSaveStatus('saved')

      // 2 秒后恢复为未保存状态（视觉上）
      setTimeout(() => {
        setSaveStatus('unsaved')
      }, 2000)
    } catch (error) {
      console.error('Failed to save journal:', error)
      if (!silent) {
        toast.error('保存失败，请重试')
      }
      setSaveStatus('unsaved')
    } finally {
      setIsSaving(false)
    }
  }

  // 触发自动保存（防抖）
  const triggerAutoSave = useCallback((id: string) => {
    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // 设置新的定时器
    autoSaveTimerRef.current = setTimeout(() => {
      if (saveNeededRef.current && id) {
        doSaveJournal(id)
      }
    }, AUTO_SAVE_DELAY)
  }, [])

  // 监听数据变化，触发自动保存
  useEffect(() => {
    if (selectedJournalId && hasUnsavedChanges) {
      saveNeededRef.current = true
      // 更新 saveDataRef 中的最新数据
      saveDataRef.current = {
        title: editTitle,
        content: editContent,
        mood: editMood,
        tags: editTags,
        linkedDimensions: editDimensions,
        isPrivate: editIsPrivate,
      }
      triggerAutoSave(selectedJournalId)
    }
  }, [
    editTitle,
    editContent,
    editMood,
    editTags,
    editDimensions,
    editIsPrivate,
    selectedJournalId,
    hasUnsavedChanges,
    triggerAutoSave,
  ])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // 处理标题变化
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTitle(e.target.value)
    setHasUnsavedChanges(true)
    setSaveStatus('unsaved')
  }

  // 处理内容变化
  const handleContentChange = (val?: string) => {
    setEditContent(val || '')
    setHasUnsavedChanges(true)
    setSaveStatus('unsaved')
  }

  // 处理情绪变化
  const handleMoodChange = (mood: MoodType) => {
    setEditMood(mood)
    setHasUnsavedChanges(true)
    setSaveStatus('unsaved')
  }

  // 处理标签变化
  const handleTagsChange = (tags: string[]) => {
    setEditTags(tags)
    setHasUnsavedChanges(true)
    setSaveStatus('unsaved')
  }

  // 处理维度变化
  const handleDimensionsChange = (type: DimensionType) => {
    setEditDimensions(prev =>
      prev.includes(type) ? prev.filter(d => d !== type) : [...prev, type]
    )
    setHasUnsavedChanges(true)
    setSaveStatus('unsaved')
  }

  // 处理私密开关变化
  const handleIsPrivateChange = (checked: boolean) => {
    // 如果开启私密功能，检查是否已设置 PIN
    if (checked && !pinStatus?.has_pin) {
      // 未设置 PIN，显示提示弹窗
      setShowPinSetupDialog(true)
      return
    }
    setEditIsPrivate(checked)
    setHasUnsavedChanges(true)
    setSaveStatus('unsaved')
  }

  // PIN 验证成功后的回调
  const handlePinVerifySuccess = async () => {
    if (verifyJournalId) {
      try {
        const journal = await getJournal(verifyJournalId)
        setSelectedJournal(journal)
        setSelectedJournalId(verifyJournalId)
        setEditTitle(journal.title || '未命名')
        setEditContent(journal.content)
        setEditMood(journal.mood || 'good')
        setEditTags(journal.tags || [])
        setEditDimensions(journal.linkedDimensions || [])
        setEditIsPrivate(journal.isPrivate || false)
        setNeedsPinVerify(false)
        setVerifyJournalId(null)
        setUnlockError(undefined)
        setHasUnsavedChanges(false)
        setSaveStatus('unsaved')
        saveNeededRef.current = false
        saveDataRef.current = null
      } catch (error) {
        console.error('Failed to load journal after PIN verify:', error)
        setNeedsPinVerify(false)
        setVerifyJournalId(null)
        setSelectedJournalId(null)
      }
    }
  }

  // 过滤日记列表
  const filteredJournals = journals.filter(j => {
    const query = searchQuery.toLowerCase()
    const title = j.title?.toLowerCase() || ''
    const content = j.content?.toLowerCase() || ''
    const tags = j.tags?.map(tag => tag.toLowerCase()) || []
    return (
      title.includes(query) ||
      content.includes(query) ||
      tags.some(tag => tag.includes(query))
    )
  })

  // 按日期分组
  const groupedJournals = filteredJournals.reduce<GroupedJournal>(
    (acc, journal) => {
      const date = formatDateCN(journal.timestamp)
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(journal)
      return acc
    },
    {}
  )

  // 按日期排序
  const sortedDates = Object.keys(groupedJournals).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  // 获取情绪图标
  const getMoodIcon = (mood: MoodType) => {
    const moodObj = MOODS.find(m => m.type === mood)
    return moodObj?.icon
  }

  // 获取情绪颜色
  const getMoodColor = (mood: MoodType) => {
    const moodObj = MOODS.find(m => m.type === mood)
    return moodObj?.color
  }

  // 需要 PIN 验证界面
  if (needsPinVerify && pinStatus?.has_pin) {
    return (
      <PinLockScreen
        description="请输入 PIN 码以查看此私密日记"
        error={unlockError}
        onCancel={() => {
          // 取消验证时清空选中状态，返回日记列表
          setNeedsPinVerify(false)
          setVerifyJournalId(null)
          setUnlockError(undefined)
          setSelectedJournal(null)
          setSelectedJournalId(null)
        }}
        onUnlock={async pin => {
          setUnlockError(undefined)
          const result = await verifyPin(pin)
          if (!result.success) {
            setUnlockError(result.error || 'PIN 验证失败')
            return
          }
          handlePinVerifySuccess()
        }}
        showCancelButton={true}
        title="查看私密日记"
        unlockButtonText="验证并查看"
        unlockingText="验证中..."
      />
    )
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex overflow-hidden">
      {/* 左侧边栏 - 日记列表 */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-apple-border dark:border-white/5 bg-apple-bg2/30 dark:bg-white/[0.02]">
        {/* 顶部工具栏 */}
        <div className="p-3 border-b border-apple-border dark:border-white/5 flex items-center gap-2">
          <Button
            className="flex-1 h-9"
            disabled={isSaving}
            onClick={handleCreateJournal}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="p-3 border-b border-apple-border dark:border-white/5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-textSec dark:text-white/40" />
            <Input
              className="pl-9 h-9 bg-black/5 dark:bg-white/5 border-apple-border dark:border-white/10"
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索日记..."
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3.5 h-3.5 text-apple-textSec dark:text-white/40 hover:text-apple-textMain dark:hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* 日记列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-apple-textSec dark:text-white/40 text-sm">
              加载中...
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-apple-textSec dark:text-white/40">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">
                {searchQuery
                  ? '未找到匹配的日记'
                  : '暂无日记，点击新建开始记录'}
              </p>
            </div>
          ) : (
            sortedDates.map(date => {
              const isExpanded = expandedDates.has(date)
              return (
                <div className="mb-4" key={date}>
                  <button
                    className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-apple-textSec dark:text-white/40 uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                    onClick={() => toggleDateExpand(date)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <span className="flex-1 text-left">{date}</span>
                    <span className="text-[10px] opacity-60">
                      {groupedJournals[date].length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-0.5">
                      {groupedJournals[date].map(journal => {
                        const MoodIcon = getMoodIcon(journal.mood || 'good')
                        const isSelected = selectedJournalId === journal.id

                        return (
                          <button
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all group',
                              isSelected
                                ? 'bg-apple-accent/10 dark:bg-white/10 text-apple-textMain dark:text-white'
                                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
                            )}
                            key={journal.id}
                            onClick={() => loadJournalDetail(journal.id)}
                          >
                            {MoodIcon && (
                              <MoodIcon
                                className={cn(
                                  'w-4 h-4 flex-shrink-0',
                                  getMoodColor(journal.mood || 'good')
                                )}
                              />
                            )}
                            <span className="flex-1 truncate text-sm">
                              {journal.title || '未命名'}
                            </span>
                            {journal.isPrivate && (
                              <LockKeyhole className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 中间内容区 - 日记详情 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedJournal ? (
          <>
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-apple-border dark:border-white/5">
              <div className="flex items-center gap-3 flex-1">
                <Input
                  className="text-4xl font-bold bg-transparent border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  onChange={handleTitleChange}
                  placeholder="日记标题"
                  type="text"
                  value={editTitle}
                />
                <span className="text-xs text-apple-textSec dark:text-white/40 flex items-center gap-1 min-w-[80px]">
                  {saveStatus === 'saving' && (
                    <>
                      <Save className="w-3 h-3 animate-pulse" />
                      保存中...
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">已保存</span>
                    </>
                  )}
                  {saveStatus === 'unsaved' && hasUnsavedChanges && (
                    <>
                      <Save className="w-3 h-3 animate-pulse" />
                      保存中...
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* 日记内容区 */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex">
                {/* 左侧 - 标题和内容 */}
                <div className="flex-1 overflow-y-auto p-6">
                  <TiptapEditor
                    className="h-full"
                    onChange={handleContentChange}
                    placeholder="开始记录你的生活..."
                    value={editContent}
                  />
                </div>

                {/* 右侧 - 属性面板 */}
                <div className="w-72 flex-shrink-0 border-l border-apple-border dark:border-white/5 bg-apple-bg2/30 dark:bg-white/[0.02] overflow-y-auto p-4 space-y-4">
                  {/* 情绪选择 */}
                  <div>
                    <div className="text-xs font-semibold text-apple-textSec dark:text-white/40 uppercase tracking-wider mb-3">
                      情绪
                    </div>
                    <MoodSelector
                      onChange={handleMoodChange}
                      value={editMood}
                      variant="icon"
                    />
                  </div>

                  {/* 标签 */}
                  <div>
                    <div className="text-xs font-semibold text-apple-textSec dark:text-white/40 uppercase tracking-wider mb-3">
                      标签
                    </div>
                    <TagInput
                      onChange={handleTagsChange}
                      placeholder="添加标签..."
                      value={editTags}
                    />
                  </div>

                  {/* 关联维度 */}
                  <div>
                    <div className="text-xs font-semibold text-apple-textSec dark:text-white/40 uppercase tracking-wider mb-3">
                      关联维度
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DIMENSIONS.map(dim => (
                        <button
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            editDimensions.includes(dim.type)
                              ? 'bg-opacity-20 shadow-sm'
                              : 'opacity-50 hover:opacity-80'
                          )}
                          key={dim.type}
                          onClick={() => handleDimensionsChange(dim.type)}
                          style={{
                            backgroundColor: editDimensions.includes(dim.type)
                              ? `${dim.color}20`
                              : undefined,
                            color: editDimensions.includes(dim.type)
                              ? dim.color
                              : undefined,
                          }}
                        >
                          {dim.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 私密开关 */}
                  <div>
                    <div className="text-xs font-semibold text-apple-textSec dark:text-white/40 uppercase tracking-wider mb-3">
                      私密日记
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {editIsPrivate ? (
                          <Lock className="w-4 h-4 text-purple-500" />
                        ) : (
                          <LockKeyhole className="w-4 h-4 text-apple-textSec dark:text-white/40" />
                        )}
                        <span className="text-sm">
                          {editIsPrivate ? '已开启私密保护' : '公开日记'}
                        </span>
                      </div>
                      <Switch
                        checked={editIsPrivate}
                        className={
                          editIsPrivate
                            ? 'data-[state=checked]:bg-purple-500'
                            : ''
                        }
                        onCheckedChange={handleIsPrivateChange}
                      />
                    </div>
                  </div>

                  {/* 创建时间 */}
                  <div className="pt-4 border-t border-apple-border dark:border-white/5">
                    <div className="text-xs text-apple-textSec dark:text-white/40">
                      创建于
                    </div>
                    <div className="text-sm text-apple-textMain dark:text-white mt-1">
                      {formatDateTimeCN(selectedJournal.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* 未选择日记时的空状态 */
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-apple-textSec dark:text-white/40">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">选择一篇日记查看</p>
              <p className="text-sm mt-2">或点击左侧"新建"按钮创建新日记</p>
            </div>
          </div>
        )}
      </div>

      {/* PIN 设置提示弹窗 */}
      {showPinSetupDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="!p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center">
                <LockKeyhole className="text-purple-500" size={40} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-apple-textMain dark:text-white mb-2">
                  需要设置 PIN 码
                </h3>
                <p className="text-sm text-apple-textSec dark:text-white/60">
                  开启日记私密功能前需要先设置 PIN 码
                </p>
              </div>

              <div className="w-full bg-purple-500/5 dark:bg-purple-500/5 border border-purple-500/20 dark:border-purple-500/10 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="text-purple-500 shrink-0 mt-0.5"
                    size={16}
                  />
                  <div className="text-left space-y-1">
                    <p className="text-xs font-semibold text-purple-500 dark:text-purple-400">
                      PIN 码作用
                    </p>
                    <div className="text-xs text-apple-textSec dark:text-white/60 space-y-1">
                      <p>• 保护私密日记不被他人查看</p>
                      <p>• 只有输入正确的 PIN 码才能访问私密内容</p>
                      <p>• PIN 码为 6 位数字</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <Button
                  onClick={() => setShowPinSetupDialog(false)}
                  variant="outline"
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                  onClick={() => {
                    navigate('/settings?tab=security')
                    setShowPinSetupDialog(false)
                  }}
                >
                  去设置
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
