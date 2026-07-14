/**
 * FilterBar — project / status / priority dropdown menus + debounced search + clear-all.
 *
 * Reads params & actions from ListView (T019's useListParams). Debounced
 * search uses a named hook so no bare useEffect lives in the component body.
 */
import { forwardRef, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryOptions } from '@tanstack/react-query'
import { ChevronDown, Check, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { request } from '@/lib/request'
import type { Project, IssueStatus, IssuePriority } from '@/lib/api-types'
import { cn } from '@/lib/utils'
import type { ListParams } from '../types'
import type { ListParamActions } from '../use-list-params'
import { PRIORITY_LABEL, STATUS_LABEL } from '../status-visuals'

const STATUS_OPTIONS: readonly IssueStatus[] = ['todo', 'in_progress', 'done', 'archived']
const PRIORITY_OPTIONS: readonly IssuePriority[] = ['p0', 'p1', 'p2', 'p3']

const projectsQuery = queryOptions({
  queryKey: ['projects', 'list'] as const,
  queryFn: () => request<Project[]>('/api/projects'),
  staleTime: 60_000,
})

interface FilterBarProps {
  params: ListParams
  actions: ListParamActions
  onCreateIssue: () => void
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
 * Bi-directional sync between the local input state and `params.q`:
 * - forward: debounced local edits → setFilter (unless the incoming debounced
 *   value equals the URL — that's the initial mount or a value we just wrote).
 * - reverse: when `params.q` changes externally (side-nav navigation, clear
 *   button, browser back), push it into `setLocal` so the input reflects the URL.
 *
 * A `lastWritten` ref tracks the last string we pushed to params so we don't
 * re-fire the reverse sync from our own write, avoiding a double-render loop.
 *
 * AC-038: refreshing `/list?q=foo&page=3` must not clobber page → we skip the
 * forward setFilter on initial mount and whenever debounced already matches
 * params.q.
 */
function useSyncSearchTerm(
  local: string,
  setLocal: (v: string) => void,
  params: ListParams,
  actions: ListParamActions,
): void {
  const debounced = useDebouncedValue(local, 250)
  const actionsRef = useRef(actions)
  actionsRef.current = actions
  const lastWritten = useRef<string>(params.q ?? '')

  useEffect(() => {
    const next = debounced.trim()
    const current = params.q ?? ''
    if (next === current) return
    lastWritten.current = next
    actionsRef.current.setFilter({ q: next || undefined, page: 1 })
  }, [debounced, params.q])

  useEffect(() => {
    const remote = params.q ?? ''
    if (remote === lastWritten.current) return
    lastWritten.current = remote
    setLocal(remote)
  }, [params.q, setLocal])
}

function toggleArray<T>(arr: readonly T[] | undefined, value: T): T[] {
  const list = arr ?? []
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

interface FilterTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  count?: number
  hasValue: boolean
}

const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  ({ label, count, hasValue, className, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'h-8 gap-1.5',
        hasValue && 'border-primary/60 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary',
        className
      )}
      {...props}
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-primary/15 px-1.5 text-xs font-medium leading-4 text-primary">
          {count}
        </span>
      )}
      <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
    </Button>
  )
)
FilterTrigger.displayName = 'FilterTrigger'

export function FilterBar({ params, actions, onCreateIssue }: FilterBarProps) {
  const [localQ, setLocalQ] = useState(params.q ?? '')
  useSyncSearchTerm(localQ, setLocalQ, params, actions)

  const { data: projects } = useQuery(projectsQuery)

  const statusCount = params.status?.length ?? 0
  const priorityCount = params.priority?.length ?? 0
  const activeProject = projects?.find((p) => p.id === params.project_id)

  const hasActiveFilter =
    Boolean(params.project_id) ||
    statusCount > 0 ||
    priorityCount > 0 ||
    Boolean(params.q)

  const setProject = (id: string | undefined) => {
    actions.setFilter({ project_id: id, page: 1 })
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

  const projectLabel = activeProject ? `项目：${activeProject.name}` : '项目'

  return (
    <div className="flex-none flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-3">
      <div className="relative w-full sm:w-64 shrink-0">
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

      {projects && projects.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger
              label={projectLabel}
              hasValue={Boolean(activeProject)}
              aria-label="按项目筛选"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[12rem]">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setProject(undefined)
              }}
              className="justify-between"
            >
              <span>全部项目</span>
              {!activeProject && <Check className="h-4 w-4 shrink-0" aria-hidden />}
            </DropdownMenuItem>
            {projects.map((p) => {
              const selected = params.project_id === p.id
              return (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={(e) => {
                    e.preventDefault()
                    setProject(selected ? undefined : p.id)
                  }}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterTrigger
            label="状态"
            count={statusCount}
            hasValue={statusCount > 0}
            aria-label="按状态筛选"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[10rem]">
          {STATUS_OPTIONS.map((s) => {
            const selected = params.status?.includes(s) ?? false
            return (
              <DropdownMenuItem
                key={s}
                onSelect={(e) => {
                  e.preventDefault()
                  toggleStatus(s)
                }}
                className="justify-between"
              >
                <span>{STATUS_LABEL[s]}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FilterTrigger
            label="优先级"
            count={priorityCount}
            hasValue={priorityCount > 0}
            aria-label="按优先级筛选"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[10rem]">
          {PRIORITY_OPTIONS.map((p) => {
            const selected = params.priority?.includes(p) ?? false
            return (
              <DropdownMenuItem
                key={p}
                onSelect={(e) => {
                  e.preventDefault()
                  togglePriority(p)
                }}
                className="justify-between"
              >
                <span>{PRIORITY_LABEL[p]}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClearAll}
        disabled={!hasActiveFilter}
        className="h-8 text-muted-foreground hover:text-foreground"
      >
        重置
      </Button>

      <Button
        type="button"
        size="sm"
        onClick={onCreateIssue}
        className="ml-auto h-8 gap-1.5"
      >
        <Plus className="h-4 w-4" aria-hidden />
        新建issue
      </Button>
    </div>
  )
}
