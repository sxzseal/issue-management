/**
 * 搜索工具栏 — 搜索输入 + 筛选槽 + 右侧动作槽
 * 不做防抖，父组件负责节流。
 */
import * as React from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchToolbarProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  filters?: React.ReactNode
  actions?: React.ReactNode
  onClear?: () => void
  className?: string
}

export function SearchToolbar({
  value,
  onChange,
  placeholder = '搜索…',
  filters,
  actions,
  onClear,
  className,
}: SearchToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-none flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-3',
        className,
      )}
    >
      <div className="relative min-w-0 flex-1 md:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      {value.length > 0 && onClear ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          清除全部
        </Button>
      ) : null}
      {filters ? (
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      ) : null}
      {actions ? (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
