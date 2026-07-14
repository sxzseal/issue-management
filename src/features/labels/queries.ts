import { queryOptions } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { Label } from '@/lib/api-types'

export const LABELS_QUERY_KEY = ['labels', 'list'] as const

export const labelsQueryOptions = queryOptions({
  queryKey: LABELS_QUERY_KEY,
  queryFn: () => request<Label[]>('/api/labels'),
  staleTime: 60_000,
})
