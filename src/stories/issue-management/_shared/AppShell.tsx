'use client'

/**
 * L2 · issue-management 项目应用外壳
 *
 * 提供顶栏 + 侧栏，主区可滚动。所有 feature story 通过 <AppShell> 包裹自己的内容。
 * 遵守 page-scroll-layout enhancer：整个 viewport 固定，只有主区滚动。
 */

import type { ReactNode } from 'react'
import {
  Inbox,
  LayoutGrid,
  List,
  BarChart3,
  Webhook,
  Plus,
  Search,
  Bell,
  Settings2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MOCK_PROJECTS } from './domain'

export type NavKey = 'board' | 'list' | 'stats' | 'webhook'

interface AppShellProps {
  children: ReactNode
  activeNav?: NavKey
  activeProjectId?: string
  onNewIssue?: () => void
  breadcrumb?: string
}

const NAV_ITEMS: Array<{ key: NavKey; label: string; icon: typeof LayoutGrid; href: string }> = [
  { key: 'board', label: '看板', icon: LayoutGrid, href: '/board' },
  { key: 'list', label: '列表', icon: List, href: '/list' },
  { key: 'stats', label: '统计', icon: BarChart3, href: '/stats' },
  { key: 'webhook', label: 'Webhook', icon: Webhook, href: '/settings/webhook' },
]

function TopBar({
  onNewIssue,
  breadcrumb,
}: {
  onNewIssue?: () => void
  breadcrumb?: string
}) {
  return (
    <header
      role="banner"
      className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-semibold">
          I
        </div>
        <span className="font-semibold tracking-tight">Issue</span>
        {breadcrumb ? (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="truncate text-sm text-muted-foreground">{breadcrumb}</span>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2 flex-1 max-w-md min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索 issue、项目、标签…"
            className="pl-8 h-9 bg-background"
            aria-label="全局搜索"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          className="gap-1.5 h-9"
          onClick={onNewIssue}
          aria-label="新建 issue（快捷键 n）"
        >
          <Plus className="h-4 w-4" />
          新建
          <kbd className="ml-1 hidden md:inline-flex items-center rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1 text-[10px] font-mono">
            N
          </kbd>
        </Button>
        <Button variant="ghost" size="icon" aria-label="通知" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 h-9" aria-label="用户菜单">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-medium">
                我
              </div>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>me@local</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings2 className="mr-2 h-4 w-4" />
              设置
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Webhook className="mr-2 h-4 w-4" />
              Webhook 设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function Sidebar({
  activeNav,
  activeProjectId,
}: {
  activeNav?: NavKey
  activeProjectId?: string
}) {
  return (
    <aside
      role="navigation"
      aria-label="主导航"
      className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card/50"
    >
      <nav className="p-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeNav === item.key
          return (
            <button
              key={item.key}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <Separator className="mx-3 w-auto" />

      <div className="px-3 pt-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          项目
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="新建项目"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 pt-1.5 flex flex-col gap-0.5">
        {MOCK_PROJECTS.map((project) => {
          const isActive = activeProjectId === project.id
          const isInbox = project.id === 'proj_inbox'
          return (
            <button
              key={project.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors group',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-foreground/80',
              )}
            >
              {isInbox ? (
                <Inbox className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <span className="truncate flex-1 text-left">{project.name}</span>
              {project.issue_count > 0 ? (
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[1.25rem] justify-center px-1 text-[10px] font-medium tabular-nums"
                >
                  {project.issue_count}
                </Badge>
              ) : null}
            </button>
          )
        })}
      </div>

      <Separator className="mx-3 w-auto" />
      <div className="p-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>数据自持 · CF 免费额度</span>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
            aria-label="在线"
          />
        </div>
      </div>
    </aside>
  )
}

export function AppShell({
  children,
  activeNav,
  activeProjectId,
  onNewIssue,
  breadcrumb,
}: AppShellProps) {
  return (
    <div
      className={cn(
        'theme-issue-management',
        'flex h-screen flex-col overflow-hidden bg-background text-foreground',
      )}
    >
      <TopBar onNewIssue={onNewIssue} breadcrumb={breadcrumb} />
      <div className="flex flex-1 min-h-0">
        <Sidebar activeNav={activeNav} activeProjectId={activeProjectId} />
        <main role="main" className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
