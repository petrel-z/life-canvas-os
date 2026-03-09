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
import TurndownService from 'turndown'
import { cn } from '~/renderer/lib/utils'

interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// 创建 turndown 实例用于 HTML 转 Markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  bulletListMarker: '-',
})

// 自定义规则：标题
turndownService.addRule('headings', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: (content: string, node: Node) => {
    const el = node as HTMLElement
    const tagName = el.tagName.toLowerCase()
    const level = parseInt(tagName.charAt(1), 10)
    const prefix = '#'.repeat(level)
    return `${prefix} ${content.trim()}\n\n`
  },
})

// 自定义规则：列表项（确保正确的缩进）
turndownService.addRule('listItems', {
  filter: 'li',
  replacement: (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return ''
    // 检查是否是任务列表项
    if (trimmed.includes('[ ]') || trimmed.includes('[x]')) {
      return `- ${trimmed}\n`
    }
    return `- ${trimmed}\n`
  },
})

// 自定义规则：有序列表
turndownService.addRule('orderedList', {
  filter: 'ol',
  replacement: (content: string) => {
    // 将内容按行分割，为每一项添加序号
    const items = content
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
    return `${items
      .map((item, index) => {
        const text = item.replace(/^- /, '')
        return `${index + 1}. ${text}`
      })
      .join('\n')}\n\n`
  },
})

// 自定义规则：段落
turndownService.addRule('paragraphs', {
  filter: 'p',
  replacement: (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return ''
    return `${trimmed}\n\n`
  },
})

// 自定义规则：任务列表项
turndownService.addRule('taskListItems', {
  filter: (node: Node) => {
    const el = node as HTMLElement
    return (
      el.nodeName === 'LI' &&
      el.hasAttribute('data-type') &&
      el.getAttribute('data-type') === 'taskItem'
    )
  },
  replacement: (content: string, node: Node) => {
    const el = node as HTMLElement
    const isChecked = el.hasAttribute('data-checked')
    const checkbox = isChecked ? '[x]' : '[ ]'
    return `- ${checkbox} ${content.trim()}\n`
  },
})

// 简单的 Markdown 转 HTML 函数
function markdownToHtml(markdown: string): string {
  if (!markdown) return '<p></p>'

  let html = markdown

  // 处理代码块（优先处理，避免内部内容被其他规则干扰）
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre><code class="language-$1">$2</code></pre>'
  )

  // 处理行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 处理标题（# 后面必须有空格）
  html = html.replace(/^### +(.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## +(.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# +(.*$)/gim, '<h1>$1</h1>')

  // 处理粗体和斜体
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>')
  html = html.replace(/__(.*?)__/g, '<u>$1</u>')

  // 处理引用
  html = html.replace(/^> +(.*$)/gim, '<blockquote>$1</blockquote>')

  // 处理链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // 处理图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

  // 处理水平线
  html = html.replace(/^---$/gim, '<hr />')

  // 处理任务列表
  html = html.replace(
    /^- \[([ x])\] +(.*$)/gim,
    '<li data-type="taskItem" data-checked="$1" === \'x\'"><div>$2</div></li>'
  )

  // 处理无序列表（- * + 后面有空格）
  html = html.replace(/^[-*+] +(.*$)/gim, '<li>$1</li>')

  // 处理有序列表（数字 +. 后面有空格）
  html = html.replace(/^\d+\. +(.*$)/gim, '<li>$1</li>')

  // 将连续的 li 包裹在 ul/ol 中
  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, match => {
    // 检查是否包含任务列表项
    if (match.includes('data-type="taskItem"')) {
      return `<ul data-type="taskList">${match}</ul>`
    }
    return `<ul>${match}</ul>`
  })

  // 处理段落 - 按双换行分隔
  const blocks = html.split(/\n\n+/)
  html = blocks
    .map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      // 如果已经是块级元素，不再包裹
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<li') ||
        trimmed.startsWith('<hr')
      ) {
        return trimmed
      }
      // 将单换行转为 <br>
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
    })
    .join('')

  // 清理多余的空段落
  html = html.replace(/<p><\/p>/g, '')
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}

// 简单的 HTML 转 Markdown 函数（作为 turndown 的补充）
function htmlToMarkdown(html: string): string {
  if (!html) return ''
  const markdown = turndownService.turndown(html)
  // 清理 turndown 添加的多余反斜杠（保留必要的转义）
  // 移除 `>`, `#`, `-`, 数字 +. 前面的反斜杠
  return markdown
    .replace(/\\>/g, '>')
    .replace(/\\#/g, '#')
    .replace(/\\[-*+]/g, (match, offset, string) => {
      // 只移除列表标记前的反斜杠（在行首）
      const prevChar = offset > 0 ? string[offset - 1] : ''
      if (prevChar === '' || prevChar === '\n') {
        return match.charAt(1)
      }
      return match
    })
    .replace(/\\(\d+)\./g, '$1.')
}

export const TiptapEditor = memo(function TiptapEditor({
  value,
  onChange,
  placeholder = '开始记录...',
  className,
}: TiptapEditorProps) {
  const [isEditorReady, setIsEditorReady] = useState(false)
  const lastContentRef = useRef('')
  const isUpdatingRef = useRef(false)
  const previousValueRef = useRef('')

  const editor = useEditor({
    extensions: [
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
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-full max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return

      const html = editor.getHTML()
      const markdown = htmlToMarkdown(html)
      if (markdown !== lastContentRef.current) {
        lastContentRef.current = markdown
        onChange(markdown)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return
      // 选择变化时也触发更新，确保气泡菜单正确显示
      const html = editor.getHTML()
      const markdown = htmlToMarkdown(html)
      if (markdown !== lastContentRef.current) {
        lastContentRef.current = markdown
        onChange(markdown)
      }
    },
    immediatelyRender: false,
    onCreate: () => {
      setIsEditorReady(true)
    },
  })

  // 只在初始加载或切换日记时更新内容
  useEffect(() => {
    if (!editor) return

    // 标记正在更新，防止触发 onUpdate
    isUpdatingRef.current = true

    const currentHtml = editor.getHTML()
    const expectedHtml = markdownToHtml(value)

    // 只有当内容真正不同时才更新（避免干扰用户输入）
    if (
      currentHtml !== expectedHtml &&
      value !== '' &&
      value !== previousValueRef.current
    ) {
      editor.commands.setContent(expectedHtml)
      previousValueRef.current = value
      lastContentRef.current = value
    }

    // 延迟重置标志，让编辑器有时间处理
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
    </div>
  )
})
