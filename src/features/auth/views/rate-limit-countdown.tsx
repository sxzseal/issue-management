import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface RateLimitCountdownProps {
  seconds: number
  onExpire?: () => void
  className?: string
}

export function RateLimitCountdown({
  seconds,
  onExpire,
  className,
}: RateLimitCountdownProps) {
  const [remaining, setRemaining] = useState<number>(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.()
      return
    }
    const timer = setTimeout(() => {
      setRemaining((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [remaining, onExpire])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn('text-sm text-destructive', className)}
    >
      尝试过多，请 <span className="font-mono">{mm}:{ss}</span> 后再试
    </div>
  )
}
