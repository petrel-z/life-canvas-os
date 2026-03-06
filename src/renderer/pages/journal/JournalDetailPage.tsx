import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Trash2, Edit, Calendar, LockKeyhole } from 'lucide-react'
import { GlassCard } from '~/renderer/components/GlassCard'
import { Button } from '~/renderer/components/ui/button'
import { Badge } from '~/renderer/components/ui/badge'
import { PinLockScreen } from '~/renderer/components/auth/PinLockScreen'
import { DIMENSIONS, MOODS } from '~/renderer/lib/constants'
import { formatDateTimeCN } from '~/renderer/lib/dateUtils'
import MDEditor from '@uiw/react-md-editor'
import { useJournalApi } from '~/renderer/hooks/useJournalApi'
import { usePinStatus } from '~/renderer/hooks/usePinStatus'
import { usePinApi } from '~/renderer/hooks'
import type { JournalEntry } from '~/shared/types'

export function JournalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { getJournal, deleteJournal } = useJournalApi()
  const { fetchPinStatus, pinStatus, setPinStatusManually } = usePinStatus()
  const { verifyPin } = usePinApi()

  const isPrivateFromState = (location.state as { isPrivate?: boolean })
    ?.isPrivate
  const [isPinVerified, setIsPinVerified] = useState(false)
  const [isCheckingPinStatus, setIsCheckingPinStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [unlockError, setUnlockError] = useState<string | undefined>(undefined)

  const isLoadingRef = useRef(false)
  const getJournalRef = useRef(getJournal)

  useEffect(() => {
    getJournalRef.current = getJournal
  }, [getJournal])

  useEffect(() => {
    setIsPinVerified(false)
  }, [id])

  // 检查 PIN 状态和验证要求
  useEffect(() => {
    const checkPinStatus = async () => {
      if (isCheckingPinStatus) return
      setIsCheckingPinStatus(true)
      try {
        const status = await fetchPinStatus()
        if (status) {
          setPinStatusManually(status)
        }

        const needsVerification =
          status?.has_pin &&
          status?.requirements?.private_journal &&
          isPrivateFromState === true

        if (!needsVerification) {
          setIsPinVerified(true)
        }
      } catch (error) {
        console.error('Failed to check PIN status:', error)
        navigate('/journal')
      } finally {
        setIsCheckingPinStatus(false)
      }
    }

    checkPinStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 加载日记详情
  useEffect(() => {
    if (!id || isLoadingRef.current || !isPinVerified) return

    isLoadingRef.current = true
    setIsLoading(true)

    getJournalRef
      .current(id)
      .then(setEntry)
      .catch(error => {
        console.error('Failed to load journal:', error)
        setEntry(null)
      })
      .finally(() => {
        setIsLoading(false)
        isLoadingRef.current = false
      })
  }, [id, isPinVerified])

  // PIN 验证界面
  const needsVerification =
    !isPinVerified &&
    isPrivateFromState &&
    pinStatus?.has_pin &&
    pinStatus?.requirements?.private_journal
  if (needsVerification && !isCheckingPinStatus) {
    return (
      <PinLockScreen
        cancelButtonText="返回列表"
        description="请输入 PIN 码以查看此私密日记"
        error={unlockError}
        onCancel={() => navigate('/journal')}
        onUnlock={async pin => {
          setUnlockError(undefined)
          const result = await verifyPin(pin)
          if (!result.success) {
            setUnlockError(result.error || 'PIN 验证失败')
            return
          }
          setIsPinVerified(true)
        }}
        showCancelButton={true}
        title="查看私密日记"
        unlockButtonText="验证并查看"
        unlockingText="验证中..."
      />
    )
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-apple-textSec dark:text-white/40">加载中...</div>
      </div>
    )
  }

  // 日记不存在
  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-apple-textTer dark:text-white/20">
        <p>日记不存在</p>
        <Link to="/journal">
          <Button className="mt-4" variant="outline">
            返回列表
          </Button>
        </Link>
      </div>
    )
  }

  const moodObj = MOODS.find(m => m.type === entry.mood)
  const MoodIcon = moodObj?.icon
  const linkedDims = entry.linkedDimensions
    ? DIMENSIONS.filter(d => entry.linkedDimensions?.includes(d.type))
    : []

  const handleDelete = async () => {
    if (!confirm('确定要删除这篇日记吗？')) return

    setIsDeleting(true)
    try {
      await deleteJournal(id!)
      navigate('/journal')
    } catch (error) {
      console.error('Failed to delete journal:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    navigate(`/journal/${id}/edit`)
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/journal">
            <Button size="icon" variant="ghost">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-apple-textMain dark:text-white">
              {entry.title || '新建日记'}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleEdit}
            size="icon"
            title="编辑"
            variant="outline"
          >
            <Edit size={18} />
          </Button>
          <Button
            className="hover:bg-destructive/10 hover:text-destructive"
            disabled={isDeleting}
            onClick={handleDelete}
            size="icon"
            title="删除"
            variant="outline"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </header>

      <GlassCard>
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-apple-border dark:border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-4xl">
                {MoodIcon && <MoodIcon className={moodObj?.color} size={40} />}
              </span>
              <div>
                <div className="text-sm font-medium text-apple-textTer dark:text-white/30 uppercase tracking-widest">
                  {moodObj?.label}
                </div>
                <div className="flex items-center gap-2 text-sm text-apple-textSec dark:text-white/40 mt-1">
                  <Calendar size={14} />
                  {formatDateTimeCN(entry.timestamp)}
                </div>
              </div>
            </div>
            {entry.isPrivate && (
              <LockKeyhole className="text-purple-500" size={20} />
            )}
          </div>

          <div data-color-mode="auto">
            <MDEditor.Markdown
              source={entry.content}
              style={{ backgroundColor: 'transparent' }}
            />
          </div>

          {linkedDims.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-apple-border dark:border-white/5">
              {linkedDims.map(dim => (
                <Badge className={dim.color} key={dim.type}>
                  {dim.label}
                </Badge>
              ))}
            </div>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-apple-border dark:border-white/5">
              {entry.tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
