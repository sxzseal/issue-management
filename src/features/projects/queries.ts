import { queryOptions, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { request } from '@/lib/request'
import type { Project } from '@/lib/api-types'

export const PROJECTS_QUERY_KEY = ['projects', 'list'] as const

export const projectsQueryOptions = queryOptions({
  queryKey: PROJECTS_QUERY_KEY,
  queryFn: () => request<Project[]>('/api/projects'),
  staleTime: 60_000,
})

/**
 * O(1) project lookup by id. Memoized against the query cache so per-row
 * consumers (board cards, list rows) don't do an O(N) `.find()` on every
 * render — the Map rebuilds only when the underlying list changes.
 */
export function useProjectsById(): Map<string, Project> {
  const { data } = useQuery(projectsQueryOptions)
  return useMemo(() => new Map((data ?? []).map((p) => [p.id, p])), [data])
}
