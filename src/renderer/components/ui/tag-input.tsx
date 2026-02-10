import React from 'react';
import { Plus, X } from 'lucide-react';
import { Badge } from '~/renderer/components/ui/badge';
import { Input } from '~/renderer/components/ui/input';
import { Button } from '~/renderer/components/ui/button';
import { cn } from '~/renderer/lib/utils';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  inputClassName?: string;
  containerClassName?: string;
  maxLength?: number;
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
  maxLength,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');

  const handleAddTag = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      if (maxLength && value.length >= maxLength) {
        return; // 达到最大数量限制
      }
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className={cn('flex gap-2 flex-wrap', containerClassName)}>
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-sm px-3 py-1 bg-apple-accent/5 text-apple-accent border border-apple-accent/10"
        >
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="ml-2 hover:text-destructive transition-colors"
            type="button"
          >
            <X size={14} />
          </button>
        </Badge>
      ))}
      <div className="relative flex-1 min-w-[140px]">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'h-9 border-dashed',
            'bg-black/5 dark:bg-white/5',
            'border-apple-border dark:border-white/10',
            inputClassName
          )}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddTag}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
          type="button"
        >
          <Plus size={16} />
        </Button>
      </div>
    </div>
  );
}
