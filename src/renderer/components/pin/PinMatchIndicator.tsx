import { CheckCircle2 } from 'lucide-react'

export interface PinMatchIndicatorProps {
  isValid: boolean
  validText?: string
  invalidText?: string
}

export function PinMatchIndicator({
  isValid,
  validText = 'PIN 码一致',
  invalidText = 'PIN 码不一致',
}: PinMatchIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {isValid ? (
        <>
          <CheckCircle2 className="text-green-500" size={14} />
          <span className="text-green-500">{validText}</span>
        </>
      ) : (
        <>
          <div className="w-3.5 h-3.5 rounded-full border-2 border-apple-error" />
          <span className="text-apple-error dark:text-red-400">
            {invalidText}
          </span>
        </>
      )}
    </div>
  )
}
