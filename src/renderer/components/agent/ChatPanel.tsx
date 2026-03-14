/**
 * Agent Chat Panel Component
 *
 * 聊天面板，显示对话历史和输入区域
 */

import { useState, useRef, useEffect } from 'react'
import {
  Bot,
  X,
  Send,
  Trash2,
  Paperclip,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '~/renderer/lib/utils'
import { ChatMessage, type Message as MessageType } from './ChatMessage'
import { Button } from '~/renderer/components/ui/button'
import { useAgentApi } from '~/renderer/hooks/useAgentApi'
import { ConfirmDialog } from './ConfirmDialog'

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

// 获取会话 ID
let currentSessionId: string | null = null
function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = `sess_${Math.random().toString(36).substring(2, 14)}`
  }
  return currentSessionId
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<MessageType[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { chat, chatStream, confirm } = useAgentApi()
  const [useStreaming, setUseStreaming] = useState(true)

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

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 聚焦输入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 发送消息（流式响应）
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: MessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // 添加助手消息占位
    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: MessageType = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // 尝试流式响应
      if (useStreaming) {
        let fullContent = ''
        let requiresConfirmation = false
        let confirmationId: string | undefined
        let confirmationMessage: string | undefined
        let streamingFailed = false

        for await (const chunk of chatStream(input.trim())) {
          if (chunk.type === 'content') {
            fullContent += chunk.data
            // 更新消息内容（打字机效果）
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            )
          } else if (chunk.type === 'done') {
            // 流式完成
            requiresConfirmation = chunk.data?.requires_confirmation || false
            confirmationId = chunk.data?.confirmation_id
            confirmationMessage = chunk.data?.confirmation_message

            // 处理确认
            if (requiresConfirmation && confirmationId) {
              setConfirmDialog({
                open: true,
                confirmationId,
                riskLevel: 'HIGH',
                title: '确认操作',
                description: confirmationMessage || '此操作需要您的确认',
                operation: '',
                requireCode: false,
              })

              // 添加确认提示消息
              const confirmMessage: MessageType = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: confirmationMessage || '请确认此操作',
                timestamp: new Date(),
                requiresConfirmation: true,
                confirmationId,
              }
              setMessages(prev => [...prev, confirmMessage])
            }
          } else if (chunk.type === 'error') {
            // 错误处理
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: chunk.data || '抱歉，我遇到了一些问题，请稍后重试。',
                      isError: true,
                    }
                  : msg
              )
            )
          }
        }

        // 如果没有确认，更新最终消息
        if (!requiresConfirmation) {
          setMessages(prev =>
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

      // 流式失败，尝试非流式降级
      if (useStreaming) {
        console.log('Streaming failed, falling back to non-streaming mode')
        setUseStreaming(false)

        // 重试非流式请求
        try {
          const response = await chat(input.trim())
          const fullContent = response.response

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent, isStreaming: false }
                : msg
            )
          )
        } catch (retryError) {
          console.error('Retry error:', retryError)
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: '抱歉，我遇到了一些问题，请稍后重试。',
                    isError: true,
                  }
                : msg
            )
          )
        }
      } else {
        // 非流式模式也失败
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: '抱歉，我遇到了一些问题，请稍后重试。',
                  isError: true,
                }
              : msg
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

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
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, resultMessage])
    } catch (error) {
      console.error('Confirm error:', error)
      const errorMessage: MessageType = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '确认失败，请稍后重试。',
        timestamp: new Date(),
        isError: true,
      }
      setMessages(prev => [...prev, errorMessage])
    }

    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  // 处理快速建议
  const handleQuickSuggestion = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  // 清除对话
  const handleClear = () => {
    setMessages([])
  }

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

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
            variant="ghost"
            size="icon-xs"
            onClick={handleClear}
            title="清除对话"
            className="text-apple-textSec hover:text-apple-textMain"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            title="关闭"
            className="text-apple-textSec hover:text-apple-textMain"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 ? (
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
                  key={index}
                  onClick={() => handleQuickSuggestion(suggestion.prompt)}
                  className="px-3 py-1.5 rounded-full bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 text-xs text-apple-textSec hover:border-apple-accent hover:text-apple-accent transition-all flex items-center gap-1.5"
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
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* 加载中 */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apple-accent to-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="message-agent px-4 py-3">
                  <div className="typing-indicator flex items-center gap-1">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-3 border-t border-apple-border shrink-0">
        {/* 快速建议（有消息时显示） */}
        {messages.length > 0 && messages.length < 3 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {QUICK_SUGGESTIONS.slice(0, 2).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleQuickSuggestion(suggestion.prompt)}
                className="px-2.5 py-1 rounded-full bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 text-[10px] text-apple-textSec hover:border-apple-accent hover:text-apple-accent transition-all flex items-center gap-1"
              >
                <suggestion.icon className="w-3 h-3" />
                {suggestion.text}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-apple-textSec"
            title="附件"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <input
            ref={inputRef}
            type="text"
            placeholder="输入消息..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 rounded-xl bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 text-sm input-focus focus:outline-none transition-all text-apple-textMain dark:text-white placeholder:text-apple-textTer"
          />

          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-xl bg-apple-accent text-white hover:bg-apple-accent/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        riskLevel={confirmDialog.riskLevel}
        title={confirmDialog.title}
        description={confirmDialog.description}
        operation={confirmDialog.operation}
        requireCode={confirmDialog.requireCode}
        confirmText="确认执行"
        cancelText="取消"
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog(prev => ({ ...prev, open: false }))
          }
        }}
        onCancel={() => handleConfirm(false)}
        onConfirm={() => handleConfirm(true)}
      />
    </div>
  )
}
