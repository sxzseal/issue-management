/**
 * Auth store — JWT + expiration, persisted to localStorage.
 *
 * Side effect on module load: registers `tokenProvider` and `onUnauthorized`
 * hooks with `src/lib/request.ts` so all outgoing requests attach
 * `Authorization: Bearer <token>` and 401 responses clear the store.
 * This side-effect runs once at first import (ES module semantics) and lets
 * the low-level `request.ts` stay free of feature-layer imports.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { configureRequest } from '@/lib/request'

export interface AuthStoreState {
  token: string | null
  expiresAt: string | null
  login: (payload: { token: string; expires_at: string }) => void
  logout: () => void
  isAuthenticated: () => boolean
}

const STORAGE_KEY = 'issue-management-auth'

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      token: null,
      expiresAt: null,
      login: ({ token, expires_at }) => set({ token, expiresAt: expires_at }),
      logout: () => set({ token: null, expiresAt: null }),
      isAuthenticated: () => {
        const { token, expiresAt } = get()
        if (!token || !expiresAt) return false
        return new Date(expiresAt).getTime() > Date.now()
      },
    }),
    { name: STORAGE_KEY },
  ),
)

/** Non-hook accessor for `request.ts` and other non-React callers. */
export function readAuthToken(): string | null {
  const s = useAuthStore.getState()
  return s.isAuthenticated() ? s.token : null
}

configureRequest({
  tokenProvider: readAuthToken,
  onUnauthorized: () => useAuthStore.getState().logout(),
})
