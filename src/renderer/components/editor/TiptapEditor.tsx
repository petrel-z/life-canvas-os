import { memo, useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
// @ts-expect-error tiptap-markdown 类型定义问题
import { Markdown } from 'tiptap-markdown'
import { cn } from '~/renderer/lib/utils'
import { PasteMarkdown } from './extensions/PasteMarkdown'

/**
 * 从编辑器内容获取 Markdown，保留空行
 *
 * 使用 tiptap-markdown 的 getMarkdown() 方法序列化整个文档
 */
function getMarkdownWithEmptyLines(editor: any): string {
  // 使用 tiptap-markdown 提供的 getMarkdown 方法
  return editor.storage.markdown.getMarkdown()
}

interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  maxLength?: number
}

export const TiptapEditor = memo(function TiptapEditor({
  value,
  onChange,
  placeholder = '开始记录...',
  className,
  maxLength = 20000,
}: TiptapEditorProps) {
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const lastContentRef = useRef('')
  const isUpdatingRef = useRef(false)
  const previousValueRef = useRef('')

  const editor = useEditor({
    extensions: [
      Markdown.configure({
        html: true, // 允许 HTML 解析
        tightLists: false, // 宽松列表，保留空行
        tightListClass: 'tight',
        bulletListMarker: '-',
        linkify: false,
        breaks: true, // 将换行符转换为硬换行
      }),
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      PasteMarkdown, // 启用 Markdown 粘贴解析
    ],
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-full max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return

      // 使用自定义函数获取 Markdown 内容（保留空行）
      const markdown = getMarkdownWithEmptyLines(editor)
      if (markdown !== lastContentRef.current) {
        lastContentRef.current = markdown
        onChange(markdown)
      }
      // 更新字符计数（使用 Markdown 源码长度，包括换行符）
      setCharCount(markdown.length)
    },
    onSelectionUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return
      // 选择变化时也触发更新
      const markdown = getMarkdownWithEmptyLines(editor)
      if (markdown !== lastContentRef.current) {
        lastContentRef.current = markdown
        onChange(markdown)
      }
      // 更新字符计数（使用 Markdown 源码长度，包括换行符）
      setCharCount(markdown.length)
    },
    immediatelyRender: false,
    onCreate: () => {
      setIsEditorReady(true)
    },
  })

  // 只在初始加载或切换日记时更新内容
  useEffect(() => {
    if (!editor) return

    isUpdatingRef.current = true

    const currentMarkdown = getMarkdownWithEmptyLines(editor)

    // 只有当内容真正不同时才更新
    if (
      currentMarkdown !== value &&
      value !== '' &&
      value !== previousValueRef.current
    ) {
      // tiptap-markdown 会自动解析 Markdown 内容
      editor.commands.setContent(value)
      previousValueRef.current = value
      lastContentRef.current = value
    }

    // 延迟重置标志
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 50)
  }, [editor, value])

  useEffect(() => {
    if (editor && !isEditorReady) {
      setIsEditorReady(true)
    }
  }, [editor, isEditorReady])

  if (!editor || !isEditorReady) {
    return <div className={className} />
  }

  return (
    <div className={cn('relative flex flex-col h-full', className)}>
      {/* 顶部固定工具栏 */}
      <div className="flex-shrink-0 border-b border-apple-border dark:border-white/5 bg-white/50 dark:bg-white/5 p-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              editor.isActive('bold')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="粗体 (Ctrl+B)"
          >
            B
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs italic transition-colors',
              editor.isActive('italic')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="斜体 (Ctrl+I)"
          >
            I
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              editor.isActive('underline')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="下划线 (Ctrl+U)"
          >
            U
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors line-through',
              editor.isActive('strike')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="删除线 (Ctrl+Shift+X)"
          >
            S
          </button>
          <div className="w-px h-4 bg-apple-border dark:bg-white/10 mx-1" />
          <button
            className={cn(
              'px-2 py-1 rounded text-xs font-bold transition-colors',
              editor.isActive('heading', { level: 1 })
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            title="标题 1"
          >
            H1
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs font-bold transition-colors',
              editor.isActive('heading', { level: 2 })
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            title="标题 2"
          >
            H2
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs font-bold transition-colors',
              editor.isActive('heading', { level: 3 })
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            title="标题 3"
          >
            H3
          </button>
          <div className="w-px h-4 bg-apple-border dark:bg-white/10 mx-1" />
          <button
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              editor.isActive('bulletList')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="无序列表"
          >
            • List
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              editor.isActive('orderedList')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="有序列表"
          >
            1. List
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              editor.isActive('taskList')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="任务列表"
          >
            ☑ Task
          </button>
          <div className="w-px h-4 bg-apple-border dark:bg-white/10 mx-1" />
          <button
            className={cn(
              'px-2 py-1 rounded text-xs italic transition-colors',
              editor.isActive('blockquote')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="引用"
          >
            "Quote
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs font-mono text-xs transition-colors',
              editor.isActive('codeBlock')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="代码块"
          >
            {'<>'}
          </button>
          <button
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              editor.isActive('link')
                ? 'bg-apple-accent/20 text-apple-textMain dark:text-white'
                : 'text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'
            )}
            onClick={() => {
              const url = window.prompt('请输入链接地址')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            title="插入链接"
          >
            🔗
          </button>
          <button
            className="px-2 py-1 rounded text-xs text-apple-textSec dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
            title="清除格式"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 编辑器内容区 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* 底部字数统计 */}
      <div className="flex-shrink-0 border-t border-apple-border dark:border-white/5 bg-white/50 dark:bg-white/5 p-2">
        <div className="flex items-center justify-between text-xs text-apple-textSec dark:text-white/40">
          <span>字数统计</span>
          <span
            className={cn(
              'font-medium',
              charCount >= maxLength ? 'text-destructive' : ''
            )}
          >
            {charCount} / {maxLength}
          </span>
        </div>
      </div>
    </div>
  )
})
