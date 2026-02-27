import React, { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '~/renderer/components/ui/input';
import { PIN_CONFIG } from '~/renderer/lib/pin';

export interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  showPin: boolean;
  onToggleVisibility: () => void;
  disabled?: boolean;
  onSubmit?: () => void;
  className?: string;
}

export const PinInput = forwardRef<HTMLInputElement, PinInputProps>(
  ({ value, onChange, showPin, onToggleVisibility, disabled = false, onSubmit, className }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmit && value.length === PIN_CONFIG.LENGTH && !disabled) {
        e.preventDefault();
        onSubmit();
      }
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPin ? 'text' : 'tel'}
          inputMode="numeric"
          placeholder="••••••"
          value={value}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, '').slice(0, PIN_CONFIG.LENGTH);
            onChange(cleaned);
          }}
          onKeyDown={handleKeyDown}
          maxLength={PIN_CONFIG.LENGTH}
          className={`text-center text-2xl tracking-[0.5em] h-14 ${className || ''}`}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-textTer hover:text-apple-textSec dark:hover:text-white/60"
          tabIndex={-1}
        >
          {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    );
  }
);

PinInput.displayName = 'PinInput';
