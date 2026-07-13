/**
 * List feature MSW handlers
 *
 * Endpoints:
 *  - GET /api/issues
 *      Query: project_id? / status? / priority? / labels? / due_from? / due_to?
 *             q? / sort? / order? / page? / page_size?
 *      → { status_code: 0, data: { list, total, page, page_size } }
 */

import { http, HttpResponse, delay } from 'msw'
import { LIST_ISSUES } from '../fixtures/list'
import type { Issue } from '@/stories/issue-management/_shared/domain'

type SortKey = keyof Pick<
  Issue,
  'title' | 'status' | 'priority' | 'due_date' | 'updated_at' | 'created_at'
>

const PRIORITY_RANK: Record<Issue['priority'], number> = {
  p0: 0,
  p1: 1,
  p2: 2,
  p3: 3,
}

const STATUS_RANK: Record<Issue['status'], number> = {
  todo: 0,
  in_progress: 1,
  done: 2,
  archived: 3,
}

function compareBy(a: Issue, b: Issue, sort: SortKey): number {
  const av = a[sort]
  const bv = b[sort]

  if (sort === 'priority') {
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  }
  if (sort === 'status') {
    return STATUS_RANK[a.status] - STATUS_RANK[b.status]
  }

  // Handle nulls (e.g. due_date)
  const aNull = av === null || av === undefined
  const bNull = bv === null || bv === undefined
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1

  if (typeof av === 'string' && typeof bv === 'string') {
    return av < bv ? -1 : av > bv ? 1 : 0
  }
  return 0
}

export const listHandlers = [
  http.get('/api/issues', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)

    const projectId = url.searchParams.get('project_id')
    const statusRaw = url.searchParams.get('status') ?? ''
    const priorityRaw = url.searchParams.get('priority') ?? ''
    const labelsRaw = url.searchParams.get('labels') ?? ''
    const dueFrom = url.searchParams.get('due_from')
    const dueTo = url.searchParams.get('due_to')
    const q = (url.searchParams.get('q') ?? '').toLowerCase().trim()
    const sort = (url.searchParams.get('sort') ?? 'updated_at') as SortKey
    const order = (url.searchParams.get('order') ?? 'desc') === 'asc' ? 'asc' : 'desc'
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
    const pageSize = Math.max(
      1,
      Math.min(200, Number(url.searchParams.get('page_size') ?? 30) || 30),
    )

    const statusFilter = statusRaw ? statusRaw.split(',').filter(Boolean) : []
    const priorityFilter = priorityRaw ? priorityRaw.split(',').filter(Boolean) : []
    const labelsFilter = labelsRaw ? labelsRaw.split(',').filter(Boolean) : []

    const filtered = LIST_ISSUES.filter((issue) => {
      if (projectId && issue.project_id !== projectId) return false
      if (statusFilter.length > 0 && !statusFilter.includes(issue.status)) return false
      if (priorityFilter.length > 0 && !priorityFilter.includes(issue.priority)) return false
      if (labelsFilter.length > 0 && !labelsFilter.some((l) => issue.label_ids.includes(l)))
        return false
      if (dueFrom && (!issue.due_date || issue.due_date < dueFrom)) return false
      if (dueTo && (!issue.due_date || issue.due_date > dueTo)) return false
      if (q && !issue.title.toLowerCase().includes(q)) return false
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      const cmp = compareBy(a, b, sort)
      return order === 'asc' ? cmp : -cmp
    })

    const total = sorted.length
    const start = (page - 1) * pageSize
    const list = sorted.slice(start, start + pageSize)

    return HttpResponse.json({
      status_code: 0,
      data: { list, total, page, page_size: pageSize },
    })
  }),
]
