import { queryOptions } from '@tanstack/react-query'
import { request } from '@/lib/request'
import type { ApiToken } from '@/lib/api-types'

export const apiTokensQueries = {
  list: () =>
    queryOptions({
      queryKey: ['api-tokens', 'list'] as const,
      queryFn: () => request<ApiToken[]>('/api/settings/api-tokens'),
      staleTime: 15_000,
    }),
}
