import { Loader2 } from 'lucide-react'

export function PageLoading() {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-apple-accent" />
    </div>
  )
}
