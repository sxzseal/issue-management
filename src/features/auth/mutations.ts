import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { request, UnauthorizedError } from '@/lib/request'
import type { LoginBody } from '@/lib/validators/auth'
import type { LoginResponse } from './types'
import { useAuthStore } from './auth-store'

export function useLoginMutation() {
  const login = useAuthStore((s) => s.login)
  return useMutation({
    mutationFn: (body: LoginBody) =>
      request<LoginResponse>('/api/auth/login', { method: 'POST', body }),
    onSuccess: (data) => {
      login({ token: data.token, expires_at: data.expires_at })
    },
  })
}

export function useLogoutMutation() {
  const logout = useAuthStore((s) => s.logout)
  return useMutation({
    mutationFn: () => request<null>('/api/auth/logout', { method: 'POST' }),
    onSettled: () => {
      logout()
    },
    onError: (e) => {
      if (!(e instanceof UnauthorizedError)) {
        toast.error('登出失败但已在本地清除会话')
      }
    },
  })
}
