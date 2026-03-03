export interface LoadingSpinnerProps {
  text?: string
  className?: string
}

export function LoadingSpinner({
  text = '加载中...',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      {text}
    </span>
  )
}
