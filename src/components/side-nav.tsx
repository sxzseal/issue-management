/**
 * SideNav — 持久化左侧导航
 * v1：4 个功能入口 + 项目列表占位。项目条目为静态 mock，后续 T017+ 用真实数据替换。
 */
import { NavLink } from 'react-router'
import {
  BarChart3,
  Inbox,
  LayoutGrid,
  ListOrdered,
  Webhook,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface ProjectItem {
  id: string
  name: string
  dotClassName: string
}

const MOCK_PROJECTS: ProjectItem[] = [
  { id: 'ai-forge', name: 'AI Forge', dotClassName: 'bg-primary' },
  { id: 'paperbird', name: 'PaperBird', dotClassName: 'bg-emerald-500' },
  { id: 'bufflab', name: 'BuffLab', dotClassName: 'bg-amber-500' },
  { id: 'infra', name: '基础设施', dotClassName: 'bg-violet-500' },
]

interface ProjectRowProps {
  project: ProjectItem
}

function ProjectRow({ project }: ProjectRowProps) {
  return (
    <li>
      <NavLink
        to={`/projects/${project.id}`}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded px-3 py-1.5 text-sm text-foreground transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isActive && 'bg-accent font-medium text-accent-foreground'
          )
        }
      >
        <span
          className={cn('h-2 w-2 flex-none rounded-full', project.dotClassName)}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
      </NavLink>
    </li>
  )
}

export function SideNav() {
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
          <NavItem to="/stats" icon={BarChart3}>
            统计
          </NavItem>
          <NavItem to="/settings/webhook" icon={Webhook}>
            Webhook
          </NavItem>
        </ul>
        <div className="mt-4 px-3 pb-2 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" aria-hidden />
            <span>项目列表</span>
          </div>
        </div>
        <ul className="flex flex-col gap-0.5">
          {MOCK_PROJECTS.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </ul>
      </div>
      <div className="flex-none border-t border-border p-3 text-xs text-muted-foreground">
        v1 · 单人个人产品
      </div>
    </nav>
  )
}
