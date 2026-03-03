import React from 'react'
import { Plus, X } from 'lucide-react'
import { Badge } from '~/renderer/components/ui/badge'
import { Input } from '~/renderer/components/ui/input'
import { Button } from '~/renderer/components/ui/button'
import { cn } from '~/renderer/lib/utils'

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  inputClassName?: string
  containerClassName?: string
  tagClassName?: string
  maxLength?: number
}

/**
 * 标签输入组件
 * 支持添加、删除标签，以及最大标签数限制
 */
export function TagInput({
  value,
  onChange,
  placeholder = '添加标签...',
  inputClassName,
  containerClassName,
  tagClassName,
  maxLength,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('')

  const handleAddTag = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      if (maxLength && value.length >= maxLength) {
        return // 达到最大数量限制
      }
      onChange([...value, inputValue.trim()])
      setInputValue('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(t => t !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className={cn('flex gap-2 flex-wrap', containerClassName)}>
      {value.map(tag => (
        <Badge
          className={cn(
            'text-sm px-3 py-1',
            tagClassName ||
              'bg-apple-accent/5 text-apple-accent border border-apple-accent/10'
          )}
          key={tag}
          variant="secondary"
        >
          {tag}
          <button
            className="ml-2 hover:text-destructive transition-colors"
            onClick={() => handleRemoveTag(tag)}
            type="button"
          >
            <X size={14} />
          </button>
        </Badge>
      ))}
      <div className="relative flex-1 min-w-[140px]">
        <Input
          className={cn(
            'h-9 border-dashed',
            'bg-black/5 dark:bg-white/5',
            'border-apple-border dark:border-white/10',
            inputClassName
          )}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          type="text"
          value={inputValue}
        />
        <Button
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
          onClick={handleAddTag}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Plus size={16} />
        </Button>
      </div>
    </div>
  )
}
