import type React from 'react'
import { forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '~/renderer/components/ui/input'
import { PIN_CONFIG } from '~/renderer/lib/pin'

export interface PinInputProps {
  value: string
  onChange: (value: string) => void
  showPin: boolean
  onToggleVisibility: () => void
  disabled?: boolean
  onSubmit?: () => void
  className?: string
}

export const PinInput = forwardRef<HTMLInputElement, PinInputProps>(
  (
    {
      value,
      onChange,
      showPin,
      onToggleVisibility,
      disabled = false,
      onSubmit,
      className,
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === 'Enter' &&
        onSubmit &&
        value.length === PIN_CONFIG.LENGTH &&
        !disabled
      ) {
        e.preventDefault()
        onSubmit()
      }
    }

    return (
      <div className="relative">
        <Input
          className={`text-center text-2xl tracking-[0.5em] h-14 ${className || ''}`}
          disabled={disabled}
          inputMode="numeric"
          maxLength={PIN_CONFIG.LENGTH}
          onChange={e => {
            const cleaned = e.target.value
              .replace(/\D/g, '')
              .slice(0, PIN_CONFIG.LENGTH)
            onChange(cleaned)
          }}
          onKeyDown={handleKeyDown}
          placeholder="••••••"
          ref={ref}
          type={showPin ? 'text' : 'tel'}
          value={value}
        />
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-textTer hover:text-apple-textSec dark:hover:text-white/60"
          onClick={onToggleVisibility}
          tabIndex={-1}
          type="button"
        >
          {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    )
  }
)

PinInput.displayName = 'PinInput'
