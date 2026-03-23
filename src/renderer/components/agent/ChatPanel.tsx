/**
 * Agent Chat Panel Component
 *
 * 聊天面板，显示对话历史和输入区域
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Send,
  Paperclip,
  MessageCircle,
  Sparkles,
  Plus,
  Bot,
  Square, // 停止图标
} from 'lucide-react'
import { cn } from '~/renderer/lib/utils'
import { ChatMessage, type Message as MessageType } from './ChatMessage'
import { Button } from '~/renderer/components/ui/button'
import {
  useAgentApi,
  getSessionId,
  type ChatResponse,
} from '~/renderer/hooks/useAgentApi'

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
import { ConfirmDialog } from './ConfirmDialog'
import { toast } from '~/renderer/lib/toast'
import { getEventBus, AgentEvents } from '~/renderer/lib/event-bus'

export interface ChatPanelProps {
  /** 关闭回调 */
  onClose?: () => void
}

// 快速建议
const QUICK_SUGGESTIONS = [
  { icon: MessageCircle, text: '帮我写一篇日记', prompt: '帮我写一篇日记' },
  { icon: Sparkles, text: '查看我的评分', prompt: '我的系统评分是多少？' },
  { icon: Bot, text: '生成今日洞察', prompt: '帮我生成今日洞察' },
]

export function ChatPanel({ onClose }: ChatPanelProps) {
  // 使用 Map 存储每个会话的消息，key 为 sessionId
  const [sessionMessages, setSessionMessages] = useState<
    Map<string, MessageType[]>
  >(() => new Map())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [sessionId, setSessionId] = useState(() => getSessionId())

  // 编辑消息状态
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  // 复制成功提示状态
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const {
    chat,
    chatStream,
    abortStream,
    confirm,
    getHistory,
    getSessionList,
    createSession,
  } = useAgentApi()
  // 生产模式 (IPC) 下禁用流式，因为 IPC 不支持 SSE 流式响应
  const [useStreaming, setUseStreaming] = useState(import.meta.env.DEV)
  // 追踪是否正在流式响应
  const [isStreaming, setIsStreaming] = useState(false)

  // 获取当前会话的消息列表
  const currentMessages = sessionMessages.get(sessionId) || []

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages])

  // 加载会话历史消息
  const loadSessionHistory = useCallback(
    async (sid: string) => {
      try {
        const history = await getHistory(sid, 50)
        setSessionMessages(prev => {
          const newMap = new Map(prev)
          newMap.set(
            sid,
            history.map((msg: any, index: number) => ({
              id: `${sid}_${index}_${Date.now()}`, // 使用会话 ID+ 索引生成唯一 ID
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }))
          )
          return newMap
        })
      } catch (error) {
        console.error('Failed to load history:', error)
      }
    },
    [getHistory]
  )

  // 加载最新会话
  const loadLatestSession = useCallback(async () => {
    try {
      // 从 localStorage 获取会话历史列表
      const sessionList = getSessionList()
      if (sessionList && sessionList.length > 0) {
        // 使用第一个（最新的）会话 ID
        const latestSessionId = sessionList[0]
        setSessionId(latestSessionId)
        // 加载历史消息
        await loadSessionHistory(latestSessionId)
      }
    } catch (error) {
      console.error('Failed to load latest session:', error)
    }
  }, [getSessionList, loadSessionHistory])

  // 聚焦输入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 初始化时加载最新会话
  useEffect(() => {
    loadLatestSession()
  }, [loadLatestSession])

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

  // 更新当前会话的消息
  const updateCurrentSessionMessages = (
    updater: (msgs: MessageType[]) => MessageType[]
  ) => {
    setSessionMessages(prev => {
      const newMap = new Map(prev)
      const currentMsgs = newMap.get(sessionId) || []
      newMap.set(sessionId, updater(currentMsgs))
      return newMap
    })
  }

  // 发送消息（流式响应）
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    updateCurrentSessionMessages(prev => [...prev, userMessage])
    setInput('') // 发送后立即清空输入框
    setIsLoading(true)
    setIsStreaming(true)

    // 添加助手消息占位
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: MessageType = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    updateCurrentSessionMessages(prev => [...prev, assistantMessage])

    try {
      // 尝试流式响应
      if (useStreaming) {
        let fullContent = ''
        let requiresConfirmation = false
        let confirmationId: string | undefined
        let confirmationMessage: string | undefined
        const streamingFailed = false

        for await (const chunk of chatStream(input.trim())) {
          if (chunk.type === 'content') {
            fullContent += chunk.data
            // 更新消息内容（打字机效果）
            updateCurrentSessionMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            )
          } else if (chunk.type === 'done') {
            // 流式完成
            const doneData = chunk.data as StreamDoneData | null
            requiresConfirmation = doneData?.requires_confirmation || false
            confirmationId = doneData?.confirmation_id
            confirmationMessage = doneData?.confirmation_message
            const riskLevel =
              (doneData?.risk_level as 'HIGH' | 'CRITICAL') || 'HIGH'
            const actionTaken = doneData?.action_taken

            // 如果没有确认，说明操作已直接执行，触发相应事件
            if (!requiresConfirmation && actionTaken) {
              // 根据 action_taken 的类型触发事件
              const eventBus = getEventBus()
              if (actionTaken.id && actionTaken.title !== undefined) {
                // 日记创建
                eventBus.emit(AgentEvents.JOURNAL_CREATED, actionTaken)
              }
            }

            // 处理确认
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
              const confirmMessage: MessageType = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: confirmationMessage || '请确认此操作',
                timestamp: Date.now(),
                requiresConfirmation: true,
                confirmationId,
              }
              updateCurrentSessionMessages(prev => [...prev, confirmMessage])
            }
          } else if (chunk.type === 'error') {
            // 错误处理
            const errorMsg =
              (chunk.data as string) || '抱歉，我遇到了一些问题，请稍后重试。'
            updateCurrentSessionMessages(prev =>
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

        // 如果没有确认，更新最终消息
        if (!requiresConfirmation) {
          updateCurrentSessionMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent, isStreaming: false }
                : msg
            )
          )
        }
      } else {
        // 非流式模式
        const response = await chat(input.trim())
        const fullContent = response.response

        updateCurrentSessionMessages(prev =>
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

      // 显示错误提示
      if (
        errorMessage.includes('API Key') ||
        errorMessage.includes('未配置 AI')
      ) {
        toast.error(errorMessage, { duration: 5000 })
      } else {
        toast.error(errorMessage || '聊天失败，请稍后重试')
      }

      // 流式失败，尝试非流式降级
      if (useStreaming) {
        console.log('Streaming failed, falling back to non-streaming mode')
        setUseStreaming(false)

        // 重试非流式请求
        try {
          const response = await chat(input.trim())
          const fullContent = response.response

          updateCurrentSessionMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent, isStreaming: false }
                : msg
            )
          )
        } catch (retryError) {
          console.error('Retry error:', retryError)
          const retryErrorMessage =
            retryError instanceof Error ? retryError.message : '重试失败'
          toast.error(retryErrorMessage)
          updateCurrentSessionMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: retryErrorMessage,
                    isError: true,
                  }
                : msg
            )
          )
        }
      } else {
        // 非流式模式也失败
        updateCurrentSessionMessages(prev =>
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
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  // 中断流式响应
  const handleStop = useCallback(() => {
    abortStream()
    setIsStreaming(false)
    setIsLoading(false)
    // 更新消息状态为已完成
    updateCurrentSessionMessages(prev =>
      prev.map(msg => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    )
  }, [abortStream])

  // 处理确认
  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmDialog.confirmationId) return

    try {
      const response = await confirm({
        session_id: getSessionId(),
        confirmation_id: confirmDialog.confirmationId,
        confirmed,
      })

      const resultMessage: MessageType = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.response,
        timestamp: Date.now(),
      }
      updateCurrentSessionMessages(prev => [...prev, resultMessage])

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

      toast.success('操作成功')
    } catch (error) {
      console.error('Confirm error:', error)
      const errorMessage = error instanceof Error ? error.message : '确认失败'
      toast.error(errorMessage)
      const errorMessageType: MessageType = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: Date.now(),
        isError: true,
      }
      updateCurrentSessionMessages(prev => [...prev, errorMessageType])
    }

    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  // 处理快速建议
  const handleQuickSuggestion = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

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

    updateCurrentSessionMessages(prev =>
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

  // 中文输入状态
  const [isComposing, setIsComposing] = useState(false)

  // 重新发送失败消息
  const handleRetryMessage = useCallback(
    async (content: string) => {
      if (isLoading) return
      setInput(content)
      inputRef.current?.focus()
    },
    [isLoading]
  )

  // 键盘事件 - Enter 发送，Shift+Enter 换行
  // 注意：在中文输入时（IME 组合中），Enter 不发送消息
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSend()
    }
    // Shift+Enter 允许换行（默认行为）
  }

  // 处理 IME 组合开始（中文输入开始）
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  // 处理 IME 组合结束（中文输入结束）
  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false)
  }, [])

  return (
    <div
      className={cn(
        'w-[380px] h-[520px]',
        'liquid-glass rounded-2xl',
        'shadow-apple-lg',
        'flex flex-col',
        'overflow-hidden'
      )}
    >
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-apple-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-accent to-blue-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-apple-textMain dark:text-white">
              AI 助手
            </div>
            <div className="text-xs text-apple-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-apple-success animate-pulse" />
              在线
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            className="text-apple-textSec hover:text-apple-accent"
            onClick={() => {
              // 创建新会话（createSession 内部会调用 setSessionId 并保存到 localStorage）
              createSession()
              // 清空消息
              setSessionMessages(new Map())
            }}
            size="icon-xs"
            title="新建会话"
            variant="ghost"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            className="text-apple-textSec hover:text-apple-textMain"
            onClick={onClose}
            size="icon-xs"
            title="关闭"
            variant="ghost"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {currentMessages.length === 0 ? (
          /* 空状态 */
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-apple-accent/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-apple-accent" />
            </div>
            <h4 className="text-lg font-semibold text-apple-textMain dark:text-white mb-2">
              你好，我是你的 AI 助手
            </h4>
            <p className="text-sm text-apple-textSec dark:text-white/40 mb-4 max-w-[240px]">
              我可以帮你管理日记、查询评分、生成洞察等
            </p>

            {/* 快速建议 */}
            <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
              {QUICK_SUGGESTIONS.map((suggestion, index) => (
                <button
                  className="px-3 py-1.5 rounded-full bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 text-xs text-apple-textSec hover:border-apple-accent hover:text-apple-accent transition-all flex items-center gap-1.5"
                  key={index}
                  onClick={() => handleQuickSuggestion(suggestion.prompt)}
                >
                  <suggestion.icon className="w-3.5 h-3.5" />
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* 消息列表 */
          <>
            {currentMessages.map((message, _index) => (
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
      <div className="p-3 border-t border-apple-border shrink-0">
        {/* 快速建议（有消息时显示） */}
        {currentMessages.length > 0 && currentMessages.length < 3 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK_SUGGESTIONS.slice(0, 2).map((suggestion, index) => (
              <button
                className="px-2.5 py-1 rounded-full bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 text-[10px] text-apple-textSec hover:border-apple-accent hover:text-apple-accent transition-all flex items-center gap-1"
                key={index}
                onClick={() => handleQuickSuggestion(suggestion.prompt)}
              >
                <suggestion.icon className="w-3 h-3" />
                {suggestion.text}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            className="text-apple-textSec"
            size="icon-sm"
            title="附件"
            variant="ghost"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <input
            className="flex-1 px-3 py-2 rounded-xl bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 text-sm input-focus focus:outline-none transition-all text-apple-textMain dark:text-white placeholder:text-apple-textTer"
            onChange={e => setInput(e.target.value)}
            onCompositionEnd={handleCompositionEnd}
            onCompositionStart={handleCompositionStart}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
            ref={inputRef}
            type="text"
            value={input}
          />

          {/* 停止按钮 - 在流式响应时显示 */}
          {isStreaming ? (
            <Button
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
              onClick={handleStop}
              size="icon"
              title="停止生成"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="rounded-xl bg-apple-accent text-white hover:bg-apple-accent/90 disabled:opacity-50"
              disabled={!input.trim() || isLoading}
              onClick={handleSend}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        cancelText="取消"
        confirmText="确认执行"
        description={confirmDialog.description}
        onCancel={() => handleConfirm(false)}
        onConfirm={() => handleConfirm(true)}
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
    </div>
  )
}
