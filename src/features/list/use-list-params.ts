import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { IssueStatus, IssuePriority } from '@/lib/api-types'
import {
  DEFAULT_LIST_PARAMS,
  type ListParams,
  type SortField,
  type SortOrder,
} from './types'

const VALID_STATUS: readonly IssueStatus[] = ['todo', 'in_progress', 'done', 'archived']
const VALID_PRIORITY: readonly IssuePriority[] = ['p0', 'p1', 'p2', 'p3']
const VALID_SORT: readonly SortField[] = ['created_at', 'updated_at', 'due_date', 'priority']
const VALID_PAGE_SIZES = [20, 50, 100] as const

function readMulti<T extends string>(
  sp: URLSearchParams,
  key: string,
  valid: readonly T[]
): T[] {
  const raw = sp.get(key)
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => (valid as readonly string[]).includes(s))
}

function readClamped<T extends string>(
  raw: string | null,
  valid: readonly T[],
  fallback: T
): T {
  if (!raw) return fallback
  return (valid as readonly string[]).includes(raw) ? (raw as T) : fallback
}

export interface ListParamActions {
  setFilter: (patch: Partial<ListParams>) => void
  clear: () => void
  /** Tri-state sort: switching field starts at asc; same field asc -> desc -> clear (revert to default). */
  setSort: (field: SortField) => void
  setPage: (page: number) => void
  setPageSize: (size: 20 | 50 | 100) => void
}

export function useListParams(): [ListParams, ListParamActions] {
  const [sp, setSp] = useSearchParams()

  const params = useMemo<ListParams>(() => {
    const projectId = sp.get('project_id') || undefined
    const status = readMulti(sp, 'status', VALID_STATUS)
    const priority = readMulti(sp, 'priority', VALID_PRIORITY)
    const labels = (sp.get('labels') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const dueFromRaw = sp.get('due_from') ?? ''
    const dueToRaw = sp.get('due_to') ?? ''
    const due_from = /^\d{4}-\d{2}-\d{2}$/.test(dueFromRaw) ? dueFromRaw : undefined
    const due_to = /^\d{4}-\d{2}-\d{2}$/.test(dueToRaw) ? dueToRaw : undefined
    const q = sp.get('q') || undefined
    const sort = readClamped<SortField>(sp.get('sort'), VALID_SORT, DEFAULT_LIST_PARAMS.sort)
    const orderRaw = sp.get('order')
    const order: SortOrder = orderRaw === 'asc' ? 'asc' : 'desc'
    const pageRaw = Number(sp.get('page') ?? DEFAULT_LIST_PARAMS.page)
    const page =
      Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : DEFAULT_LIST_PARAMS.page
    const sizeRaw = Number(sp.get('page_size') ?? DEFAULT_LIST_PARAMS.pageSize)
    const pageSize = (VALID_PAGE_SIZES as readonly number[]).includes(sizeRaw)
      ? (sizeRaw as 20 | 50 | 100)
      : DEFAULT_LIST_PARAMS.pageSize
    return {
      project_id: projectId,
      status: status.length ? status : undefined,
      priority: priority.length ? priority : undefined,
      labels: labels.length ? labels : undefined,
      due_from,
      due_to,
      q,
      sort,
      order,
      page,
      pageSize,
    }
  }, [sp])

  const writePatch = useCallback(
    (patch: Partial<ListParams>) => {
      const next = new URLSearchParams(sp)
      const write = (k: string, v: string | undefined | null) => {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if ('project_id' in patch) write('project_id', patch.project_id)
      if ('status' in patch) write('status', (patch.status ?? []).join(',') || undefined)
      if ('priority' in patch) write('priority', (patch.priority ?? []).join(',') || undefined)
      if ('labels' in patch) write('labels', (patch.labels ?? []).join(',') || undefined)
      if ('due_from' in patch) write('due_from', patch.due_from)
      if ('due_to' in patch) write('due_to', patch.due_to)
      if ('q' in patch) write('q', patch.q)
      if ('sort' in patch && patch.sort) write('sort', patch.sort)
      if ('order' in patch && patch.order) write('order', patch.order)
      if ('page' in patch && typeof patch.page === 'number') {
        write('page', patch.page > 1 ? String(patch.page) : undefined)
      }
      if ('pageSize' in patch && patch.pageSize) {
        write(
          'page_size',
          patch.pageSize !== DEFAULT_LIST_PARAMS.pageSize ? String(patch.pageSize) : undefined
        )
      }
      setSp(next, { replace: true })
    },
    [sp, setSp]
  )

  const setFilter = writePatch

  const clear = useCallback(() => {
    setSp(new URLSearchParams(), { replace: true })
  }, [setSp])

  const setSort = useCallback(
    (field: SortField) => {
      if (params.sort !== field) {
        writePatch({ sort: field, order: 'asc', page: 1 })
        return
      }
      if (params.order === 'asc') {
        writePatch({ sort: field, order: 'desc', page: 1 })
        return
      }
      writePatch({
        sort: DEFAULT_LIST_PARAMS.sort,
        order: DEFAULT_LIST_PARAMS.order,
        page: 1,
      })
    },
    [params.sort, params.order, writePatch]
  )

  const setPage = useCallback((page: number) => writePatch({ page }), [writePatch])
  const setPageSize = useCallback(
    (pageSize: 20 | 50 | 100) => writePatch({ pageSize, page: 1 }),
    [writePatch]
  )

  return [params, { setFilter, clear, setSort, setPage, setPageSize }]
}
