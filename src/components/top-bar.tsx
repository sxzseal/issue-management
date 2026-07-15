/**
 * TopBar — 顶部导航栏
 * 展示当前页面标题、主题切换、用户菜单入口。
 * v1 单人个人产品，不需要通知与全局搜索。
 */
import { useState } from 'react'
import { useMatch, useParams } from 'react-router'
import { LogOut, Tag, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { LabelManageDialog } from '@/features/labels/views/label-manage.dialog'
import { cn } from '@/lib/utils'

interface TopBarProps {
  onLogout?: () => void
  className?: string
}

function useCurrentPageTitle(): string {
  const isBoard = useMatch('/board')
  const isList = useMatch('/list')
  const isIssue = useMatch('/issue/:id')
  const isApiTokens = useMatch('/settings/api-tokens')
  const params = useParams<{ id?: string }>()

  if (isBoard) return '看板'
  if (isList) return '列表'
  if (isIssue) return params.id ? `Issue #${params.id}` : 'Issue 详情'
  if (isApiTokens) return 'API Token'
  return ''
}

export function TopBar({ onLogout, className }: TopBarProps) {
  const title = useCurrentPageTitle()
  const [labelManageOpen, setLabelManageOpen] = useState(false)

  return (
    <header
      role="banner"
      className={cn(
        'flex h-14 flex-none items-center gap-3 border-b border-border bg-background px-4',
        className,
      )}
    >
      <img src="/logo.svg" alt="Issue 管理平台" className="h-8 w-8" />
      <span className="text-lg font-bold text-foreground">{title}</span>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="用户菜单">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>我的账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLabelManageOpen(true)}>
              <Tag className="h-4 w-4" />
              <span>标签设置</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout} disabled={!onLogout}>
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <LabelManageDialog
        open={labelManageOpen}
        onOpenChange={setLabelManageOpen}
      />
    </header>
  )
}
