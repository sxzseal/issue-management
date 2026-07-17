/**
 * SideNav — 持久化左侧导航
 * 顶部为功能入口；下方是从 /api/projects 拉取的项目列表，含「管理」入口。
 * 项目按状态分组：Inbox → 规划中 → 进行中 → 已完成（已完成默认折叠）。
 */
import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  KeyRound,
  LayoutGrid,
  ListOrdered,
  Loader2,
  Settings2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project, ProjectStatus } from '@/lib/api-types'
import { projectsQueryOptions } from '@/features/projects/queries'
import { ProjectManageDialog } from '@/features/projects/views/project-manage.dialog'
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
} from '@/features/projects/status-visuals'

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
            isActive && 'bg-accent font-medium text-accent-foreground',
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
          isActive && 'bg-accent font-medium text-accent-foreground',
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
  const [archivedOpen, setArchivedOpen] = useState(false)
  const projects = useQuery(projectsQueryOptions)
  const location = useLocation()

  const activeProjectId = useMemo(() => {
    if (location.pathname !== '/list') return null
    const params = new URLSearchParams(location.search)
    return params.get('project_id')
  }, [location.pathname, location.search])

  const { inbox, byStatus } = useMemo(() => {
    const list = projects.data ?? []
    const groups: Record<ProjectStatus, Project[]> = {
      planning: [],
      active: [],
      archived: [],
    }
    let inboxProject: Project | null = null
    for (const p of list) {
      if (p.is_inbox) {
        inboxProject = p
        continue
      }
      groups[p.status].push(p)
    }
    return { inbox: inboxProject, byStatus: groups }
  }, [projects.data])

  const totalNonInbox =
    byStatus.planning.length + byStatus.active.length + byStatus.archived.length
  const archivedHasActiveProject = byStatus.archived.some(
    (p) => p.id === activeProjectId,
  )
  const showArchived = archivedOpen || archivedHasActiveProject

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
          <NavItem to="/settings/api-tokens" icon={KeyRound}>
            API Token
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
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
        ) : !inbox && totalNonInbox === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">暂无项目</p>
        ) : (
          <div className="flex flex-col gap-2">
            {inbox ? (
              <ul className="flex flex-col gap-0.5">
                <ColoredNavRow
                  key={inbox.id}
                  to={`/list?project_id=${encodeURIComponent(inbox.id)}`}
                  color={inbox.color}
                  name={inbox.name}
                  isActive={activeProjectId === inbox.id}
                />
              </ul>
            ) : null}

            {PROJECT_STATUS_ORDER.filter((s) => s !== 'archived').map((s) =>
              byStatus[s].length > 0 ? (
                <ProjectStatusGroup
                  key={s}
                  label={PROJECT_STATUS_LABEL[s]}
                  projects={byStatus[s]}
                  activeProjectId={activeProjectId}
                />
              ) : null,
            )}

            {byStatus.archived.length > 0 ? (
              <div>
                <button
                  type="button"
                  onClick={() => setArchivedOpen((v) => !v)}
                  className={cn(
                    'flex w-full items-center gap-1 rounded px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  aria-expanded={showArchived}
                >
                  {showArchived ? (
                    <ChevronDown className="h-3 w-3" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  )}
                  <span>
                    {PROJECT_STATUS_LABEL.archived}（{byStatus.archived.length}
                    ）
                  </span>
                </button>
                {showArchived ? (
                  <ul className="mt-0.5 flex flex-col gap-0.5">
                    {byStatus.archived.map((p) => (
                      <ColoredNavRow
                        key={p.id}
                        to={`/list?project_id=${encodeURIComponent(p.id)}`}
                        color={p.color}
                        name={p.name}
                        isActive={activeProjectId === p.id}
                      />
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
      <ProjectManageDialog
        open={projectManageOpen}
        onOpenChange={setProjectManageOpen}
      />
    </nav>
  )
}

interface ProjectStatusGroupProps {
  label: string
  projects: Project[]
  activeProjectId: string | null
}

function ProjectStatusGroup({
  label,
  projects,
  activeProjectId,
}: ProjectStatusGroupProps) {
  return (
    <div>
      <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ul className="flex flex-col gap-0.5">
        {projects.map((p) => (
          <ColoredNavRow
            key={p.id}
            to={`/list?project_id=${encodeURIComponent(p.id)}`}
            color={p.color}
            name={p.name}
            isActive={activeProjectId === p.id}
          />
        ))}
      </ul>
    </div>
  )
}
