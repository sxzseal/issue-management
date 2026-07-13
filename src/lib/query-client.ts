/**
 * TanStack Query 客户端工厂
 *
 * 集中默认策略：
 *   - staleTime 30s / gcTime 5min
 *   - UnauthorizedError 不重试（避免 401 循环）
 *   - 其他错误最多重试 2 次
 *   - 关闭 window focus 自动 refetch
 *   - mutations 默认不重试（幂等交给调用方显式处理）
 */
import { QueryClient } from '@tanstack/react-query'
import { UnauthorizedError } from './request'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof UnauthorizedError) return false
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
