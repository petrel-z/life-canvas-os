import React from 'react';
import { cn } from '~/renderer/lib/utils';
import { PAGE_ANIMATION } from '~/renderer/lib/styles';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('space-y-8', PAGE_ANIMATION, className)}>{children}</div>
  );
}
