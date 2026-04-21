/**
 * Agent Page Component
 *
 * 智能体聊天页面
 * 左侧：历史会话列表
 * 右侧：当前会话聊天窗口
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Bot, Plus, Trash2, Clock, MessageCircle, Square } from 'lucide-react'
import { cn } from '~/renderer/lib/utils'
import { Button } from '~/renderer/components/ui/button'
import { ChatMessage, ConfirmDialog } from '~/renderer/components/agent'
import type { Message } from '~/renderer/components/agent'
import { useAgentApi, type ChatResponse } from '~/renderer/hooks/useAgentApi'

// 流式响应 done chunk 的数据类型（包含 risk_level）
interface StreamDoneData {
  response?: string
  action_taken?: ChatResponse['action_taken']
  requires_confirmation?: boolean
  confirmation_id?: string
  confirmation_message?: string
  risk_level?: string
  session_id?: string
}
import { toast } from '~/renderer/lib/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '~/renderer/components/ui/dialog'
import { getEventBus, AgentEvents } from '~/renderer/lib/event-bus'

interface Session {
  session_id: string
  message_count: number
  last_message_time: string | null
  last_message_preview: string | null
  last_message_role: string | null
}

export function AgentPage() {
  const {
    getSessions,
    createSession,
    switchSession,
    getHistory,
    deleteSession,
    chatStream,
    confirm,
    abortStream,
  } = useAgentApi()

  // 会话列表状态
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)

  // 当前会话消息列表
  const [messages, setMessages] = useState<Message[]>([])

  // 聊天加载状态
  const [isChatLoading, setIsChatLoading] = useState(false)

  // 流式响应状态
  const [isStreaming, setIsStreaming] = useState(false)

  // 中文输入状态
  const [isComposing, setIsComposing] = useState(false)

  // 编辑消息状态
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  // 复制成功提示状态
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  // 输入框值状态（用于重试失败消息）
  const [inputValue, setInputValue] = useState('')

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    confirmationId: string | null
    riskLevel: 'HIGH' | 'CRITICAL'
    title: string
    description: string
    operation: string
    requireCode: boolean
  }>({
    open: false,
    confirmationId: null,
    riskLevel: 'HIGH',
    title: '',
    description: '',
    operation: '',
    requireCode: false,
  })

  // 删除确认对话框状态
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    sessionId: string | null
    sessionPreview: string | null
  }>({
    open: false,
    sessionId: null,
    sessionPreview: null,
  })

  // 消息列表滚动引用
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getSessions()
      setSessions(data || [])
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getSessions])

  // 加载指定会话的历史消息
  const loadSessionHistory = useCallback(
    async (sessionId: string) => {
      try {
        const history = await getHistory(sessionId, 50)
        setMessages(
          history.map((msg: any, index: number) => ({
            id: `${sessionId}_${index}_${Date.now()}`, // 使用会话 ID+ 索引生成唯一 ID
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }))
        )
      } catch (error) {
        console.error('Failed to load history:', error)
        setMessages([])
      }
    },
    [getHistory]
  )

  // 切换会话
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      switchSession(sessionId)
      setSelectedSessionId(sessionId)
      loadSessionHistory(sessionId)
    },
    [switchSession, loadSessionHistory]
  )

  // 创建新会话
  const handleCreateSession = useCallback(() => {
    const newSessionId = createSession()
    setSelectedSessionId(newSessionId)
    setMessages([])
    loadSessions()
  }, [createSession, loadSessions])

  // 删除会话确认
  const handleDeleteSession = useCallback(
    (sessionId: string, preview: string | null, e: React.MouseEvent) => {
      e.stopPropagation()
      setDeleteDialog({
        open: true,
        sessionId,
        sessionPreview: preview,
      })
    },
    []
  )

  // 确认删除会话
  const confirmDelete = useCallback(async () => {
    if (!deleteDialog.sessionId) return

    try {
      await deleteSession(deleteDialog.sessionId)
      if (selectedSessionId === deleteDialog.sessionId) {
        setSelectedSessionId(null)
        setMessages([])
      }
      setDeleteDialog({ open: false, sessionId: null, sessionPreview: null })
      loadSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }, [deleteDialog.sessionId, selectedSessionId, deleteSession, loadSessions])

  // 发送消息
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedSessionId) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      }

      setMessages(prev => [...prev, userMessage])
      setIsChatLoading(true)
      setIsStreaming(true)

      // 添加助手消息占位
      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      }
      setMessages(prev => [...prev, assistantMessage])

      try {
        let fullContent = ''
        let requiresConfirmation = false
        let confirmationId: string | undefined
        let confirmationMessage: string | undefined
        let riskLevel: 'HIGH' | 'CRITICAL' | undefined

        for await (const chunk of chatStream(content)) {
          if (chunk.type === 'content') {
            fullContent += chunk.data
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            )
          } else if (chunk.type === 'done') {
            const doneData = chunk.data as StreamDoneData | null
            requiresConfirmation = doneData?.requires_confirmation || false
            confirmationId = doneData?.confirmation_id
            confirmationMessage = doneData?.confirmation_message
            riskLevel = (doneData?.risk_level as 'HIGH' | 'CRITICAL') || 'HIGH'
            const actionTaken = doneData?.action_taken

            // 如果没有确认，说明操作已直接执行，触发相应事件
            if (!requiresConfirmation && actionTaken) {
              const eventBus = getEventBus()
              if (actionTaken.id && actionTaken.title !== undefined) {
                // 日记创建
                eventBus.emit(AgentEvents.JOURNAL_CREATED, actionTaken)
              }
            }

            if (requiresConfirmation && confirmationId) {
              const isCritical = riskLevel === 'CRITICAL'
              setConfirmDialog({
                open: true,
                confirmationId,
                riskLevel,
                title: isCritical ? '关键操作' : '确认操作',
                description: confirmationMessage || '此操作需要您的确认',
                operation: '',
                requireCode: isCritical,
              })

              // 添加确认提示消息
              const confirmMessage: Message = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: confirmationMessage || '请确认此操作',
                timestamp: Date.now(),
                requiresConfirmation: true,
                confirmationId,
              }
              setMessages(prev => [...prev, confirmMessage])
            }
          } else if (chunk.type === 'error') {
            const errorMsg =
              (chunk.data as string) || '抱歉，我遇到了一些问题，请稍后重试。'
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: errorMsg,
                      isError: true,
                    }
                  : msg
              )
            )
            // 显示错误提示
            if (errorMsg.includes('API Key')) {
              toast.error(errorMsg, { duration: 5000 })
            } else {
              toast.error(errorMsg)
            }
          }
        }

        if (!requiresConfirmation) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent, isStreaming: false }
                : msg
            )
          )
        }
      } catch (error) {
        console.error('Chat error:', error)
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: errorMessage,
                  isError: true,
                }
              : msg
          )
        )
        // 显示错误提示
        if (
          errorMessage.includes('API Key') ||
          errorMessage.includes('未配置 AI')
        ) {
          toast.error(errorMessage, { duration: 5000 })
        } else {
          toast.error(errorMessage || '聊天失败，请稍后重试')
        }
      } finally {
        setIsChatLoading(false)
        setIsStreaming(false)
      }
    },
    [selectedSessionId, chatStream]
  )

  // 中断流式响应
  const handleStop = useCallback(() => {
    abortStream()
    setIsStreaming(false)
    setIsChatLoading(false)
    // 更新消息状态为已完成
    setMessages(prev =>
      prev.map(msg => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    )
  }, [abortStream])

  // 复制消息内容
  const handleCopyMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        await navigator.clipboard.writeText(content)
        setCopiedMessageId(messageId)
        setTimeout(() => setCopiedMessageId(null), 2000)
      } catch (error) {
        console.error('Copy failed:', error)
      }
    },
    []
  )

  // 编辑消息
  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      setEditingMessageId(messageId)
      setEditingText(content)
    },
    []
  )

  // 保存编辑的消息
  const handleSaveEdit = useCallback(() => {
    if (!editingMessageId || !editingText.trim()) return

    setMessages(prev =>
      prev.map(msg =>
        msg.id === editingMessageId
          ? { ...msg, content: editingText.trim() }
          : msg
      )
    )
    setEditingMessageId(null)
    setEditingText('')
  }, [editingMessageId, editingText])

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingText('')
  }, [])

  // 重新发送失败消息
  const handleRetryMessage = useCallback(
    async (content: string) => {
      if (isChatLoading) return
      setInputValue(content)
    },
    [isChatLoading]
  )

  // 确认操作
  const handleConfirm = useCallback(
    async (confirmed: boolean, code?: string) => {
      if (!confirmDialog.confirmationId) return

      try {
        const sessionId =
          selectedSessionId ||
          localStorage.getItem('life_canvas_agent_session_id')
        if (!sessionId) return

        const response = await confirm({
          session_id: sessionId,
          confirmation_id: confirmDialog.confirmationId,
          confirmed,
          code,
        })

        const resultMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.response,
          timestamp: Date.now(),
        }
        setMessages(prev => [...prev, resultMessage])

        // 确认成功后触发相应事件
        if (confirmed) {
          const eventBus = getEventBus()
          // 根据 confirmationId 判断操作类型
          if (confirmDialog.confirmationId.startsWith('delete_journal_')) {
            const journalId = confirmDialog.confirmationId.replace(
              'delete_journal_',
              ''
            )
            eventBus.emit(AgentEvents.JOURNAL_DELETED, { id: journalId })
          }
        }
      } catch (error) {
        console.error('Confirm error:', error)
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '确认失败，请稍后重试。',
          timestamp: Date.now(),
          isError: true,
        }
        setMessages(prev => [...prev, errorMessage])
      }

      setConfirmDialog(prev => ({ ...prev, open: false }))
    },
    [confirmDialog.confirmationId, selectedSessionId, confirm]
  )

  // 格式化时间
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // 初始化加载
  useEffect(() => {
    loadSessions()

    const savedSessionId = localStorage.getItem('life_canvas_agent_session_id')
    if (savedSessionId) {
      setSelectedSessionId(savedSessionId)
      loadSessionHistory(savedSessionId)
    }
  }, [])

  return (
    <div className="flex-1 flex overflow-hidden bg-apple-bgMain dark:bg-black">
      {/* 左侧会话列表 */}
      <aside className="w-80 border-r border-apple-border flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-apple-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-accent to-blue-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-apple-textMain dark:text-white">
                会话列表
              </div>
              <div className="text-xs text-apple-textSec dark:text-white/40">
                {sessions.length} 个会话
              </div>
            </div>
          </div>
          <Button
            className="text-apple-textSec hover:text-apple-accent"
            onClick={handleCreateSession}
            size="icon-sm"
            title="新建会话"
            variant="ghost"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-apple-accent/30 border-t-apple-accent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-apple-accent/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-apple-accent" />
              </div>
              <h4 className="text-sm font-semibold text-apple-textMain dark:text-white mb-1">
                暂无会话
              </h4>
              <p className="text-xs text-apple-textSec dark:text-white/40 mb-4">
                开始与 AI 助手对话吧
              </p>
              <Button
                className="bg-apple-accent hover:bg-apple-accent/90"
                onClick={handleCreateSession}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                新建会话
              </Button>
            </div>
          ) : (
            sessions.map(session => (
              <div
                className={cn(
                  'group relative p-3 rounded-xl bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 hover:border-apple-accent/50 transition-all cursor-pointer',
                  selectedSessionId === session.session_id &&
                    'border-apple-accent/50 bg-apple-accent/5'
                )}
                key={session.session_id}
                onClick={() => handleSelectSession(session.session_id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-accent/20 to-blue-600/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-apple-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-apple-textSec dark:text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.last_message_time)}
                      </span>
                      <Button
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-apple-textSec hover:text-red-500"
                        onClick={e =>
                          handleDeleteSession(
                            session.session_id,
                            session.last_message_preview,
                            e
                          )
                        }
                        size="icon-xs"
                        variant="ghost"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="text-sm text-apple-textMain dark:text-white truncate">
                      {session.last_message_preview || '新会话'}
                    </div>
                    <div className="text-xs text-apple-textSec dark:text-white/40 mt-1">
                      {session.message_count} 条消息
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 右侧聊天区域 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-apple-accent/10 flex items-center justify-center mb-4">
                <Bot className="w-10 h-10 text-apple-accent" />
              </div>
              <h3 className="text-lg font-semibold text-apple-textMain dark:text-white mb-2">
                开始对话
              </h3>
              <p className="text-sm text-apple-textSec dark:text-white/40 max-w-[300px]">
                输入消息与 AI
                助手开始对话，它可以帮你管理日记、查询评分、生成洞察等
              </p>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <ChatMessage
                  copied={copiedMessageId === message.id}
                  editingText={editingText}
                  isEditing={editingMessageId === message.id}
                  key={message.id}
                  message={message}
                  onCancelEdit={handleCancelEdit}
                  onCopy={() => handleCopyMessage(message.id, message.content)}
                  onEdit={() => handleEditMessage(message.id, message.content)}
                  onRetry={() => handleRetryMessage(message.content)}
                  onSaveEdit={handleSaveEdit}
                />
              ))}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-apple-border bg-apple-bgMain dark:bg-black">
          <div className="max-w-4xl mx-auto">
            <InputMessage
              disabled={isChatLoading}
              isComposing={isComposing}
              isStreaming={isStreaming}
              onCompositionEnd={() => setIsComposing(false)}
              onCompositionStart={() => setIsComposing(true)}
              onSend={handleSendMessage}
              onStop={handleStop}
              onValueChange={setInputValue}
              value={inputValue}
            />
          </div>
        </div>
      </main>

      {/* 确认对话框 */}
      <ConfirmDialog
        cancelText="取消"
        confirmText="确认执行"
        description={confirmDialog.description}
        onCancel={() => handleConfirm(false)}
        onConfirm={(code?: string) => handleConfirm(true, code)}
        onOpenChange={open => {
          if (!open) {
            setConfirmDialog(prev => ({ ...prev, open: false }))
          }
        }}
        open={confirmDialog.open}
        operation={confirmDialog.operation}
        requireCode={confirmDialog.requireCode}
        riskLevel={confirmDialog.riskLevel}
        title={confirmDialog.title}
      />

      {/* 删除确认对话框 */}
      <Dialog
        onOpenChange={open => setDeleteDialog(prev => ({ ...prev, open }))}
        open={deleteDialog.open}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除会话</DialogTitle>
            <DialogDescription>
              确认删除以下会话？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>

          {deleteDialog.sessionPreview && (
            <div className="p-3 rounded-xl bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10">
              <div className="text-sm text-apple-textMain dark:text-white truncate">
                {deleteDialog.sessionPreview}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              onClick={() =>
                setDeleteDialog({
                  open: false,
                  sessionId: null,
                  sessionPreview: null,
                })
              }
              variant="outline"
            >
              取消
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-500/90"
              onClick={confirmDelete}
              variant="destructive"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 输入框组件
interface InputMessageProps {
  onSend: (message: string) => Promise<void>
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
  value?: string
  onValueChange?: (value: string) => void
  isComposing?: boolean
  onCompositionStart?: () => void
  onCompositionEnd?: () => void
}

function InputMessage({
  onSend,
  onStop,
  disabled,
  isStreaming = false,
  value,
  onValueChange,
  isComposing = false,
  onCompositionStart,
  onCompositionEnd,
}: InputMessageProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  // 判断是否是受控模式
  const isControlled = value !== undefined && onValueChange !== undefined

  // 如果提供了受控输入值，则使用它
  const inputValue = isControlled ? value : input
  const setInputValue = isControlled ? onValueChange : setInput

  const handleSend = async () => {
    if (!inputValue.trim() || disabled) return
    await onSend(inputValue.trim())
    // 清空输入框
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSend()
    }
    // Shift+Enter 允许换行（默认行为）
  }

  return (
    <div className="flex items-center gap-3">
      <input
        className={cn(
          'flex-1 px-4 py-3 rounded-xl',
          'bg-apple-bgSidebar dark:bg-white/5',
          'border border-apple-border dark:border-white/10',
          'text-sm text-apple-textMain dark:text-white',
          'placeholder:text-apple-textTer dark:text-white/40',
          'focus:outline-none focus:border-apple-accent/50',
          'transition-all'
        )}
        onChange={e => setInputValue(e.target.value)}
        onCompositionEnd={onCompositionEnd}
        onCompositionStart={onCompositionStart}
        onKeyDown={handleKeyDown}
        placeholder="输入消息，按 Enter 发送..."
        ref={inputRef}
        type="text"
        value={inputValue}
      />

      {/* 停止按钮 - 在流式响应时显示 */}
      {isStreaming ? (
        <Button
          className={cn(
            'rounded-xl px-5',
            'bg-red-500 hover:bg-red-600 text-white',
            'transition-all'
          )}
          onClick={onStop}
          size="default"
          title="停止生成"
        >
          <Square className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          className={cn(
            'rounded-xl px-5',
            'bg-apple-accent text-white',
            'hover:bg-apple-accent/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all'
          )}
          disabled={!inputValue.trim() || disabled}
          onClick={handleSend}
          size="default"
        >
          发送
        </Button>
      )}
    </div>
  )
}
