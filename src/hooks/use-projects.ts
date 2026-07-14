import { useMemo } from 'react'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { Project } from '@/lib/api-types'

const projectsQuery = queryOptions({
  queryKey: ['projects', 'list'] as const,
  queryFn: () => request<Project[]>('/api/projects'),
  staleTime: 60_000,
})

/**
 * Look up project metadata by id — used by list rows and board headers
 * to display the human name rather than the raw project_id.
 */
export function useProjectsMap(): Map<string, Project> {
  const { data } = useQuery(projectsQuery)
  return useMemo(() => {
    const m = new Map<string, Project>()
    ;(data ?? []).forEach((p) => m.set(p.id, p))
    return m
  }, [data])
}
