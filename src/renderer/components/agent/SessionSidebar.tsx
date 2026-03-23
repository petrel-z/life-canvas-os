/**
 * Agent Session Sidebar Component
 *
 * 会话列表侧边栏，显示和管理所有会话
 */

import { useState, useEffect } from 'react'
import {
  MessageCircle,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  MessageSquare,
  X,
} from 'lucide-react'
import { cn } from '~/renderer/lib/utils'
import { Button } from '~/renderer/components/ui/button'
import {
  useAgentApi,
  getSessionHistory,
  type SessionSummary,
} from '~/renderer/hooks/useAgentApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '~/renderer/components/ui/dialog'

export interface SessionSidebarProps {
  /** 是否显示 */
  open?: boolean
  /** 关闭回调 */
  onClose?: () => void
  /** 会话切换回调 */
  onSessionSwitch?: (sessionId: string) => void
}

interface Session {
  session_id: string
  message_count: number
  last_message_time: string | null
  last_message_preview: string | null
  last_message_role: string | null
}

export function SessionSidebar({
  open = false,
  onClose,
  onSessionSwitch,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<
    Array<{
      session_id: string
      message_count: number
      last_message_time: string | null
      last_message_preview: string | null
      last_message_role: string | null
    }>
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    sessionId: string | null
    sessionPreview: string | null
  }>({
    open: false,
    sessionId: null,
    sessionPreview: null,
  })

  const {
    getSessions,
    switchSession,
    deleteSession,
    createSession,
    getSessionList,
    getHistory,
  } = useAgentApi()

  // 加载会话列表 - 从 localStorage 获取会话 ID 列表，然后从后端获取每个会话的信息
  const loadSessions = async () => {
    setIsLoading(true)
    try {
      // 从 localStorage 获取会话 ID 列表
      const sessionIds = getSessionHistory()

      // 从后端获取有上下文的会话列表（有实际对话的会话）
      const backendSessions = await getSessions()
      const backendSessionMap = new Map(
        backendSessions.map((s: SessionSummary) => [s.session_id, s])
      )

      // 合并数据：优先显示有上下文的会话，然后是没有上下文的 session ID
      const mergedSessions: Array<{
        session_id: string
        message_count: number
        last_message_time: string | null
        last_message_preview: string | null
        last_message_role: string | null
      }> = []

      // 先添加有上下文的会话
      for (const session of backendSessions) {
        mergedSessions.push({
          session_id: session.session_id,
          message_count: session.message_count,
          last_message_time: session.last_message_time,
          last_message_preview: session.last_message_preview,
          last_message_role: session.last_message_role,
        })
      }

      // 添加没有上下文的会话 ID（新创建但还没对话的会话）
      for (const sessionId of sessionIds) {
        if (!backendSessionMap.has(sessionId)) {
          mergedSessions.push({
            session_id: sessionId,
            message_count: 0,
            last_message_time: null,
            last_message_preview: null,
            last_message_role: null,
          })
        }
      }

      setSessions(mergedSessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      // 降级：只显示 localStorage 中的会话 ID
      const sessionIds = getSessionHistory()
      setSessions(
        sessionIds.map(id => ({
          session_id: id,
          message_count: 0,
          last_message_time: null,
          last_message_preview: null,
          last_message_role: null,
        }))
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadSessions()
    }
  }, [open])

  // 格式化时间
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // 小于 1 分钟
    if (diff < 60000) return '刚刚'
    // 小于 1 小时
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    // 小于 24 小时
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    // 小于 7 天
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

    // 超过 7 天显示日期
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    })
  }

  // 切换会话
  const handleSwitchSession = (sessionId: string) => {
    switchSession(sessionId)
    onSessionSwitch?.(sessionId)
    onClose?.()
  }

  // 创建新会话
  const handleCreateSession = () => {
    createSession()
    setSessions([])
    loadSessions()
    onSessionSwitch?.('')
    onClose?.()
  }

  // 删除会话
  const handleDeleteSession = (sessionId: string, preview: string | null) => {
    setDeleteDialog({
      open: true,
      sessionId,
      sessionPreview: preview,
    })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.sessionId) return

    try {
      await deleteSession(deleteDialog.sessionId)
      setDeleteDialog({ open: false, sessionId: null, sessionPreview: null })
      loadSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-80',
          'liquid-glass border-l border-apple-border',
          'shadow-apple-lg',
          'flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
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
          <div className="flex items-center gap-1">
            <Button
              className="text-apple-textSec hover:text-apple-accent"
              onClick={handleCreateSession}
              size="icon-sm"
              title="新建会话"
              variant="ghost"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              className="text-apple-textSec hover:text-apple-textMain"
              onClick={onClose}
              size="icon-sm"
              title="关闭"
              variant="ghost"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
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
                <MessageSquare className="w-8 h-8 text-apple-accent" />
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
                className="group relative p-3 rounded-xl bg-apple-bgSidebar dark:bg-white/5 border border-apple-border dark:border-white/10 hover:border-apple-accent/50 transition-all cursor-pointer"
                key={session.session_id}
                onClick={() => handleSwitchSession(session.session_id)}
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
                        onClick={e => {
                          e.stopPropagation()
                          handleDeleteSession(
                            session.session_id,
                            session.last_message_preview
                          )
                        }}
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
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-textSec opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          )}
        </div>
      </div>

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
    </>
  )
}
