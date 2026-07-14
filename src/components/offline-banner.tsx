import { WifiOff } from 'lucide-react'
import { useOffline } from '@/hooks/use-offline'

/**
 * Sticky top banner shown while `navigator.onLine === false`. Uses the
 * destructive semantic token so the state is unmistakable.
 */
export function OfflineBanner() {
  const offline = useOffline()
  if (!offline) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground"
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      离线中，操作会在网络恢复后同步
    </div>
  )
}
