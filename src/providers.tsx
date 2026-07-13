/**
 * 顶层 Providers 组合
 *
 * 层级（外到内）：
 *   ErrorBoundary → ThemeProvider → QueryClientProvider → children + Toaster
 *
 * - ErrorBoundary 放最外层，兜底 provider 初始化异常
 * - QueryClient 通过 useState lazy init，避免每次 re-render 重建
 * - Toaster 放 QueryClient 之内，方便 mutations 直接 toast
 */
import { type ReactNode, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import { createQueryClient } from '@/lib/query-client'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => createQueryClient())
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
