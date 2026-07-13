import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EyeToggleProps {
  show: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}

export function EyeToggle({ show, onToggle, disabled, className }: EyeToggleProps) {
  const Icon = show ? EyeOff : Eye
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={onToggle}
      disabled={disabled}
      tabIndex={-1}
      aria-label={show ? '隐藏密码' : '显示密码'}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  )
}
