/**
 * SideNav — 持久化左侧导航
 * 顶部为功能入口；下方是从 /api/projects 拉取的项目列表，含「管理」入口。
 */
import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Inbox,
  LayoutGrid,
  ListOrdered,
  Loader2,
  Settings2,
  Webhook,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { projectsQueryOptions } from '@/features/projects/queries'
import { ProjectManageDialog } from '@/features/projects/views/project-manage.dialog'

interface NavItemProps {
  to: string
  icon: LucideIcon
  end?: boolean
  children: React.ReactNode
}

function NavItem({ to, icon: Icon, end, children }: NavItemProps) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isActive && 'bg-accent font-medium text-accent-foreground'
          )
        }
      >
        <Icon className="h-4 w-4 flex-none" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{children}</span>
      </NavLink>
    </li>
  )
}

interface ColoredNavRowProps {
  to: string
  color: string
  name: string
  isActive: boolean
}

/**
 * Shared row for the projects / labels sidebar lists: a colored dot + name +
 * active/hover ring. The `isActive` prop is computed once in the parent from
 * a memoized URLSearchParams, so N rows no longer each parse the search string
 * and subscribe to router updates.
 */
function ColoredNavRow({ to, color, name, isActive }: ColoredNavRowProps) {
  return (
    <li>
      <NavLink
        to={to}
        className={cn(
          'flex items-center gap-2 rounded px-3 py-1.5 text-sm text-foreground transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'bg-accent font-medium text-accent-foreground'
        )}
      >
        <span
          aria-hidden
          className="h-2 w-2 flex-none rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="min-w-0 flex-1 truncate">{name}</span>
      </NavLink>
    </li>
  )
}

export function SideNav() {
  const [projectManageOpen, setProjectManageOpen] = useState(false)
  const projects = useQuery(projectsQueryOptions)
  const location = useLocation()

  const activeProjectId = useMemo(() => {
    if (location.pathname !== '/list') return null
    const params = new URLSearchParams(location.search)
    return params.get('project_id')
  }, [location.pathname, location.search])

  return (
    <nav
      role="navigation"
      aria-label="主导航"
      className="hidden w-60 flex-none flex-col border-r border-border bg-card md:flex"
    >
      <div className="flex-none px-4 py-4">
        <span className="text-sm font-medium text-foreground">导航</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-0.5">
          <NavItem to="/board" icon={LayoutGrid}>
            看板
          </NavItem>
          <NavItem to="/list" icon={ListOrdered}>
            列表
          </NavItem>
          <NavItem to="/settings/webhook" icon={Webhook}>
            Webhook
          </NavItem>
        </ul>
        <div className="mt-4 flex items-center justify-between px-3 pb-2 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" aria-hidden />
            <span>项目列表</span>
          </div>
          <button
            type="button"
            onClick={() => setProjectManageOpen(true)}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label="管理项目"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            管理
          </button>
        </div>
        {projects.isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            加载中…
          </div>
        ) : (projects.data ?? []).length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">暂无项目</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {(projects.data ?? []).map((p) => (
              <ColoredNavRow
                key={p.id}
                to={`/list?project_id=${encodeURIComponent(p.id)}`}
                color={p.color}
                name={p.name}
                isActive={activeProjectId === p.id}
              />
            ))}
          </ul>
        )}
      </div>
      <ProjectManageDialog open={projectManageOpen} onOpenChange={setProjectManageOpen} />
    </nav>
  )
}
