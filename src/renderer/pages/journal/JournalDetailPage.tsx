import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit, Calendar, LockKeyhole } from 'lucide-react';
import { useApp } from '~/renderer/contexts/AppContext';
import { GlassCard } from '~/renderer/components/GlassCard';
import { Button } from '~/renderer/components/ui/button';
import { Badge } from '~/renderer/components/ui/badge';
import { PinVerifyDialog } from '~/renderer/components/auth/PinVerifyDialog';
import { DIMENSIONS, MOODS, type MoodType } from '~/renderer/lib/constants';
import { formatDateTimeCN } from '~/renderer/lib/dateUtils';
import MDEditor from '@uiw/react-md-editor';
import { pinApi } from '~/renderer/api';
import { useJournalApi } from '~/renderer/hooks/useJournalApi';
import type { JournalEntry } from '~/shared/types';

export function JournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getJournal, deleteJournal } = useJournalApi();
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [entry, setEntry] = useState<JournalEntry | null>(null);

  // 从路由状态获取是否私密（如果有的话）
  const isPrivateFromList = location.state?.isPrivate || false;

  // 使用 ref 避免重复调用
  const isLoadingRef = useRef(false);
  const getJournalRef = useRef(getJournal);

  // 更新 ref
  useEffect(() => {
    getJournalRef.current = getJournal;
  }, [getJournal]);

  // 当离开详情页时，清除 PIN 验证状态，确保下次查看需要重新验证
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('pin-verified');
    };
  }, []);

  // 检查会话中是否已验证 PIN
  useEffect(() => {
    const verified = sessionStorage.getItem('pin-verified') === 'true';
    setIsPinVerified(verified);
    // 如果是私密日记且未验证 PIN，则不需要显示加载状态
    if (isPrivateFromList && !verified) {
      setIsLoading(false);
    }
  }, []);

  // 加载日记详情
  const loadJournal = async () => {
    if (!id || isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setIsLoading(true);
      const journalData = await getJournalRef.current(id);
      setEntry(journalData);
    } catch (error) {
      console.error('Failed to load journal:', error);
      setEntry(null);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 根据私密状态决定是否加载
  useEffect(() => {
    // 如果非私密，或已经验证 PIN，则立即加载
    if (!isPrivateFromList || isPinVerified) {
      loadJournal();
    }
  }, [id, isPinVerified]); // 依赖 isPinVerified 以便验证后加载

  // 私密日记，需要验证 PIN（使用从列表页传递的信息）
  // 这个判断要在加载中判断之前，因为私密日记未验证时 entry 为 null 是正常的
  if (isPrivateFromList && !isPinVerified && !isLoading) {
    // 自动显示 PIN 验证弹窗
    if (!showPinDialog) {
      setTimeout(() => setShowPinDialog(true), 100);
    }

    const handleClose = () => {
      setShowPinDialog(false);
      navigate('/journal');
    };

    const handleVerify = async (pin: string) => {
      try {
        const response = await pinApi.verify(pin);

        if (!response.ok) {
          return false;
        }

        sessionStorage.setItem('pin-verified', 'true');
        setIsPinVerified(true);
        setShowPinDialog(false);
        // PIN 验证成功后，加载日记详情
        await loadJournal();
        return true;
      } catch {
        return false;
      }
    };

    return (
      <div className="flex flex-col items-center justify-center h-96 text-apple-textSec dark:text-white/40">
        <PinVerifyDialog
          isOpen={showPinDialog}
          onClose={handleClose}
          onVerify={handleVerify}
        />
      </div>
    );
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-apple-textSec dark:text-white/40">加载中...</div>
      </div>
    );
  }

  // 日记不存在
  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-apple-textTer dark:text-white/20">
        <p>日记不存在</p>
        <Link to="/journal">
          <Button variant="outline" className="mt-4">
            返回列表
          </Button>
        </Link>
      </div>
    );
  }

  const moodObj = MOODS.find((m) => m.type === entry.mood);
  const MoodIcon = moodObj?.icon;
  const linkedDims = entry.linkedDimensions
    ? DIMENSIONS.filter((d) => entry.linkedDimensions?.includes(d.type))
    : [];

  const handleDelete = async () => {
    if (!confirm('确定要删除这篇日记吗？')) return;

    setIsDeleting(true);

    try {
      await deleteJournal(id!);
      navigate('/journal');
    } catch (error) {
      console.error('Failed to delete journal:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/journal/${id}/edit`);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/journal">
            <Button variant="ghost" size="icon">
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
          <Button variant="outline" size="icon" onClick={handleEdit} title="编辑">
            <Edit size={18} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="hover:bg-destructive/10 hover:text-destructive"
            title="删除"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </header>

      <GlassCard>
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-apple-border dark:border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{MoodIcon && <MoodIcon className={moodObj?.color} size={40} />}</span>
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
              {linkedDims.map((dim) => (
                <Badge key={dim.type} className={dim.color}>
                  {dim.label}
                </Badge>
              ))}
            </div>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-apple-border dark:border-white/5">
              {entry.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
