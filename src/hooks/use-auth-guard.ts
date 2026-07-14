import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuthStore } from '@/features/auth/auth-store'

/**
 * Redirect to /login if the current session isn't authenticated.
 * Preserves the current path as `?next=<encoded>` so login can return the user
 * to where they were.
 * Idempotent — runs whenever the auth state or route changes.
 */
export function useAuthGuard(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      const next = location.pathname + location.search
      navigate(`/login?next=${encodeURIComponent(next)}`, {
        replace: true,
        state: { from: next },
      })
    }
  }, [isAuthenticated, location.pathname, location.search, navigate])
}
