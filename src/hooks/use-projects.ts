import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Project } from '@/lib/api-types'
import { projectsQueryOptions } from '@/features/projects/queries'

/**
 * Look up project metadata by id — used by list rows and board headers
 * to display the human name rather than the raw project_id.
 */
export function useProjectsMap(): Map<string, Project> {
  const { data } = useQuery(projectsQueryOptions)
  return useMemo(() => {
    const m = new Map<string, Project>()
    ;(data ?? []).forEach((p) => m.set(p.id, p))
    return m
  }, [data])
}
