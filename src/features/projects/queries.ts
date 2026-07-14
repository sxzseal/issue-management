import { queryOptions } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { Project } from '@/lib/api-types'

export const PROJECTS_QUERY_KEY = ['projects', 'list'] as const

export const projectsQueryOptions = queryOptions({
  queryKey: PROJECTS_QUERY_KEY,
  queryFn: () => request<Project[]>('/api/projects'),
  staleTime: 60_000,
})
