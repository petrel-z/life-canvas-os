import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '~/renderer/lib/utils';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  iconClassName?: string;
}

/**
 * 搜索输入框组件，带有搜索图标
 */
export function SearchInput({
  className,
  iconClassName,
  placeholder = '搜索...',
  ...props
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 text-apple-textSec dark:text-white/30',
          iconClassName
        )}
        size={18}
      />
      <input
        type="text"
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-4 py-2.5',
          'bg-black/5 dark:bg-white/5',
          'border border-apple-border dark:border-white/10',
          'rounded-xl',
          'text-apple-textMain dark:text-white',
          'placeholder:text-apple-textTer dark:placeholder:text-white/20',
          'focus:outline-none focus:ring-2 focus:ring-apple-accent/30',
          'transition-all',
          className
        )}
        {...props}
      />
    </div>
  );
}
