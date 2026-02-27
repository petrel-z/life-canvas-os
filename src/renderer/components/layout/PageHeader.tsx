import React from 'react';
import { cn } from '~/renderer/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  extra?: React.ReactNode; // 右侧额外内容（如评分、统计等）
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  extra,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex justify-between items-start', className)}>
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-apple-textMain dark:text-white flex items-center gap-3">
          {icon}
          {title}
        </h1>
        {description && (
          <p className="text-apple-textSec dark:text-white/40 mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {extra && <div className="text-right">{extra}</div>}
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </header>
  );
}
