import { PIN_CONFIG } from '~/renderer/lib/pin'

export interface PinStrengthIndicatorProps {
  pinLength: number
  total?: number
  className?: string
}

export function PinStrengthIndicator({
  pinLength,
  total = PIN_CONFIG.LENGTH,
  className = '',
}: PinStrengthIndicatorProps) {
  return (
    <div className={`flex gap-1 ${className}`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          className={`h-1.5 flex-1 rounded-full transition-all ${
            i < pinLength
              ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
              : 'bg-apple-border dark:bg-white/10'
          }`}
          key={i}
        />
      ))}
    </div>
  )
}
