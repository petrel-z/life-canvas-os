import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Lock, Eye, EyeOff } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useApp } from '~/renderer/contexts/AppContext';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { Input } from '~/renderer/components/ui/input';
import { Textarea } from '~/renderer/components/ui/textarea';
import { Badge } from '~/renderer/components/ui/badge';
import { Switch } from '~/renderer/components/ui/switch';
import { MoodSelector } from '~/renderer/components/ui/mood-selector';
import { TagInput } from '~/renderer/components/ui/tag-input';
import { DIMENSIONS, MOODS, type MoodType } from '~/renderer/lib/constants';
import type { DimensionType, JournalEntry } from '~/shared/types';
import { toast } from '~/renderer/lib/toast';
import { pinApi } from '~/renderer/api';
import { useJournalApi } from '~/renderer/hooks/useJournalApi';
import { usePinStatus } from '~/renderer/hooks/usePinStatus';

export function JournalEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state, updateState } = useApp();
  const { createJournal, updateJournal, getJournal } = useJournalApi();
  const { fetchPinStatus, pinStatus } = usePinStatus();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<MoodType>('good');
  const [tags, setTags] = useState<string[]>([]);
  const [linkedDimensions, setLinkedDimensions] = useState<DimensionType[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  // 加载日记详情（编辑模式）
  useEffect(() => {
    const loadJournal = async () => {
      if (!isEditing || !id) return

      try {
        setIsLoadingData(true)
        const journalData = await getJournal(id)
        setExistingEntry(journalData)

        // 回显数据
        setTitle(journalData.title || '')
        setContent(journalData.content)
        setMood(journalData.mood)
        setTags(journalData.tags || [])
        setLinkedDimensions(journalData.linkedDimensions || [])
        setIsPrivate(journalData.isPrivate || false)
      } catch (error) {
        console.error('Failed to load journal:', error)
        toast.error('加载日记失败')
        navigate('/journal')
      } finally {
        setIsLoadingData(false)
      }
    }

    loadJournal()
  }, [isEditing, id, getJournal, navigate])

  // 检查 PIN 状态（优先从缓存获取）
  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        // fetchPinStatus 会优先从缓存读取，如果缓存没有或过期才调用接口
        await fetchPinStatus();
      } catch (error) {
        console.error('Failed to check PIN status:', error)
      }
    };
    checkPinStatus();
  }, [fetchPinStatus]);

  const handleToggleDimension = (dimType: DimensionType) => {
    setLinkedDimensions(prev =>
      prev.includes(dimType)
        ? prev.filter(d => d !== dimType)
        : [...prev, dimType]
    )
  }

  const handlePrivateToggle = (checked: boolean) => {
    // 如果要开启私密功能
    if (checked) {
      // 等待 PIN 状态加载完成
      if (pinStatus === null) {
        toast.error('正在检查 PIN 状态...', {
          description: '请稍候',
        });
        return;
      }

      // 如果没有设置 PIN
      if (!pinStatus.has_pin_set) {
        toast.error('需要设置 PIN 码', {
          description: '私密日记功能需要先设置 PIN 码保护',
        });

        // 保存当前草稿
        const draft = {
          title,
          content,
          mood,
          tags,
          linkedDimensions,
          isPrivate: false, // 暂时设为 false
        };
        localStorage.setItem('journal-draft', JSON.stringify(draft));

        // 跳转到 PIN 设置页
        setTimeout(() => {
          navigate('/settings/pin', { state: { returnUrl: '/journal/new' } });
        }, 500);
        return;
      }
    }

    setIsPrivate(checked)
  }

  const handleSave = async () => {
    if (!content.trim()) return;

    // 安全检查：如果要保存为私密日记，必须有 PIN
    if (isPrivate && !pinStatus?.has_pin_set) {
      toast.error('无法保存私密日记', {
        description: '私密日记功能需要先设置 PIN 码保护',
      });
      return;
    }

    setIsLoading(true)

    try {
      const entry = {
        id: isEditing ? id! : crypto.randomUUID(),
        timestamp: existingEntry?.timestamp || Date.now(),
        title: title.trim() || '新建日记',
        content,
        mood,
        tags,
        attachments: [] as string[],
        linkedDimensions,
        isPrivate,
      }

      if (isEditing) {
        const updated = await updateJournal(id!, entry)
        setExistingEntry(updated) // 更新本地数据
      } else {
        const created = await createJournal(entry)
        setExistingEntry(created)
      }

      navigate('/journal')
    } catch (error) {
      console.error('Failed to save journal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/journal')
  }

  // 加载中
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-apple-textSec dark:text-white/40">加载中...</div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <header className="flex items-center gap-4">
        <Button onClick={handleCancel} size="icon" variant="ghost">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-apple-textMain dark:text-white">
            {isEditing ? '编辑日记' : '新建日记'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCancel} variant="outline">
            取消
          </Button>
          <Button
            className="bg-purple-500 hover:bg-purple-600"
            disabled={!content.trim() || isLoading}
            onClick={handleSave}
          >
            <Save className="mr-2" size={18} />
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        <GlassCard>
          <div className="space-y-6">
            <Input
              className="text-lg font-semibold bg-black/5 dark:bg-white/5 border-apple-border dark:border-white/10"
              onChange={e => setTitle(e.target.value)}
              placeholder="标题（可选）"
              type="text"
              value={title}
            />

            <div>
              <label className="text-sm font-medium text-apple-textSec dark:text-white/60 mb-3 block">
                选择情绪
              </label>
              <MoodSelector onChange={setMood} value={mood} variant="emoji" />
            </div>

            <div>
              <div data-color-mode="auto">
                <MDEditor
                  height={400}
                  hideToolbar={false}
                  onChange={val => setContent(val || '')}
                  preview="edit"
                  value={content}
                  visibleDragbar={false}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-apple-textSec dark:text-white/60 mb-3 block">
                标签
              </label>
              <TagInput
                onChange={setTags}
                placeholder="添加标签..."
                value={tags}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-apple-textSec dark:text-white/60 mb-3 block">
                关联维度（可选）
              </label>
              <div className="flex flex-wrap gap-2">
                {DIMENSIONS.map(dim => (
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      linkedDimensions.includes(dim.type)
                        ? 'bg-opacity-20 shadow-sm'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                    key={dim.type}
                    onClick={() => handleToggleDimension(dim.type)}
                    style={{
                      backgroundColor: linkedDimensions.includes(dim.type)
                        ? `${dim.color}20`
                        : undefined,
                      color: linkedDimensions.includes(dim.type)
                        ? dim.color
                        : undefined,
                    }}
                  >
                    {dim.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-apple-bg2 dark:bg-white/5 rounded-xl border border-apple-border dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  {isPrivate ? (
                    <Lock className="text-purple-500" size={18} />
                  ) : (
                    <EyeOff
                      className="text-apple-textTer dark:text-white/30"
                      size={18}
                    />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-apple-textMain dark:text-white">
                    私密日记
                  </div>
                  <div className="text-xs text-apple-textSec dark:text-white/40">
                    {pinStatus === null
                      ? '正在检查 PIN 状态...'
                      : isPrivate
                      ? '需要 PIN 码才能查看此日记'
                      : pinStatus?.has_pin_set
                        ? '开启后需要 PIN 码才能查看'
                        : '需要先设置 PIN 码'}
                  </div>
                </div>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={handlePrivateToggle}
                disabled={pinStatus === null || (!pinStatus?.has_pin_set && !isPrivate)}
                className={isPrivate ? 'data-[state=checked]:bg-purple-500' : ''}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
