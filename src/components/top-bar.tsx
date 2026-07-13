/**
 * TopBar — 顶部导航栏
 * 提供全局搜索、新建 issue、通知、主题切换与用户菜单入口。
 * 具体动作由父级注入（onNewIssue / onLogout），v1 未接入真实处理。
 */
import { Bell, LogOut, Plus, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

interface TopBarProps {
  onNewIssue?: () => void
  onLogout?: () => void
  className?: string
}

export function TopBar({ onNewIssue, onLogout, className }: TopBarProps) {
  return (
    <header
      role="banner"
      className={cn(
        'flex h-14 flex-none items-center gap-3 border-b border-border bg-background px-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold text-foreground">Issue</span>
        <Separator orientation="vertical" className="h-5" />
        <span className="text-sm text-muted-foreground">首页</span>
      </div>

      <div className="relative ml-4 hidden md:block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="全局搜索…"
          aria-label="全局搜索"
          className="h-9 w-72 pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={onNewIssue}>
          <Plus className="h-4 w-4" />
          <span>新建 Issue</span>
          <kbd className="ml-2 rounded border border-input bg-muted px-1 text-xs text-muted-foreground">
            N
          </kbd>
        </Button>

        <Button variant="ghost" size="icon" aria-label="通知">
          <Bell className="h-4 w-4" />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="用户菜单">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>我的账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout} disabled={!onLogout}>
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
