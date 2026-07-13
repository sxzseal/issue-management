/**
 * FilterBar — project / status / priority chips + debounced search + clear-all.
 *
 * Reads params & actions from ListView (T019's useListParams). Debounced
 * search uses a named hook so no bare useEffect lives in the component body.
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryOptions } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { request } from '@/lib/request'
import type { Project, IssueStatus, IssuePriority } from '@/lib/api-types'
import { cn } from '@/lib/utils'
import type { ListParams } from '../types'
import type { ListParamActions } from '../use-list-params'

const STATUS_OPTIONS: readonly IssueStatus[] = ['todo', 'in_progress', 'done', 'archived']
const PRIORITY_OPTIONS: readonly IssuePriority[] = ['p0', 'p1', 'p2', 'p3']

const STATUS_LABEL: Record<IssueStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  archived: '已归档',
}

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
}

const projectsQuery = queryOptions({
  queryKey: ['projects', 'list'] as const,
  queryFn: () => request<Project[]>('/api/projects'),
  staleTime: 60_000,
})

interface FilterBarProps {
  params: ListParams
  actions: ListParamActions
}

/**
 * Debounce a value by `ms`. Lives in a named hook so its effect isn't
 * a bare useEffect in the component body.
 */
function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}

/**
 * Pushes the debounced search text into ListParams. Encapsulated in a hook
 * so the calling component stays effect-free. `actions` is stashed in a ref
 * so URL churn from other filters doesn't refire this effect.
 */
function useSyncSearchTerm(local: string, actions: ListParamActions): void {
  const debounced = useDebouncedValue(local, 250)
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  useEffect(() => {
    actionsRef.current.setFilter({ q: debounced.trim() || undefined, page: 1 })
  }, [debounced])
}

interface ChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  ariaLabel?: string
}

function Chip({ active, onClick, children, ariaLabel }: ChipProps) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className="h-8"
    >
      {children}
      {active && <X className="ml-1 h-3 w-3" aria-hidden />}
    </Button>
  )
}

function toggleArray<T>(arr: readonly T[] | undefined, value: T): T[] {
  const list = arr ?? []
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function FilterBar({ params, actions }: FilterBarProps) {
  const [localQ, setLocalQ] = useState(params.q ?? '')
  useSyncSearchTerm(localQ, actions)

  const { data: projects } = useQuery(projectsQuery)

  const hasActiveFilter =
    Boolean(params.project_id) ||
    (params.status?.length ?? 0) > 0 ||
    (params.priority?.length ?? 0) > 0 ||
    Boolean(params.q)

  const toggleProject = (id: string) => {
    actions.setFilter({
      project_id: params.project_id === id ? undefined : id,
      page: 1,
    })
  }
  const toggleStatus = (s: IssueStatus) => {
    const next = toggleArray(params.status, s)
    actions.setFilter({ status: next.length ? next : undefined, page: 1 })
  }
  const togglePriority = (p: IssuePriority) => {
    const next = toggleArray(params.priority, p)
    actions.setFilter({ priority: next.length ? next : undefined, page: 1 })
  }
  const handleClearAll = () => {
    setLocalQ('')
    actions.clear()
  }

  return (
    <div className="flex-none flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-3">
      {projects && projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {projects.map((p) => {
            const active = params.project_id === p.id
            return (
              <Chip
                key={p.id}
                active={active}
                onClick={() => toggleProject(p.id)}
                ariaLabel={`项目：${p.name}`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="max-w-[8rem] truncate">{p.name}</span>
              </Chip>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_OPTIONS.map((s) => (
          <Chip
            key={s}
            active={params.status?.includes(s) ?? false}
            onClick={() => toggleStatus(s)}
          >
            {STATUS_LABEL[s]}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRIORITY_OPTIONS.map((p) => (
          <Chip
            key={p}
            active={params.priority?.includes(p) ?? false}
            onClick={() => togglePriority(p)}
          >
            {PRIORITY_LABEL[p]}
          </Chip>
        ))}
      </div>

      <div className={cn('relative ml-auto flex-1 min-w-0 max-w-xs')}>
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="搜索标题…"
          className="pl-8 h-9"
          aria-label="搜索 issue 标题"
        />
      </div>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={handleClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          清除全部
        </button>
      )}
    </div>
  )
}
