import React from 'react';
import { cn } from '~/renderer/lib/utils';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 加载中 Spinner 组件
 */
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn(
        'animate-spin text-apple-accent',
        sizeClasses[size],
        className
      )}
    />
  );
}

export interface LoadingOverlayProps {
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

/**
 * 全屏或局部加载遮罩
 */
export function LoadingOverlay({
  fullScreen = false,
  message = '加载中...',
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        'bg-black/5 dark:bg-white/5',
        'backdrop-blur-sm',
        fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0',
        className
      )}
    >
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-sm text-apple-textSec dark:text-white/60">
          {message}
        </p>
      )}
    </div>
  );
}

export interface LoadingDotsProps {
  className?: string;
}

/**
 * 加载动画点
 */
export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-apple-accent [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-apple-accent [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-apple-accent" />
      </div>
    </div>
  );
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

/**
 * 骨架屏组件
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded max-w-sm',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-apple-bg2 dark:bg-white/5',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
}

export interface CardSkeletonProps {
  className?: string;
}

/**
 * 卡片骨架屏
 */
export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'liquid-glass rounded-xl p-6 space-y-4',
        className
      )}
    >
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rectangular" width={60} height={24} />
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
    </div>
  );
}
