# features/auth

**Purpose**: authentication state (JWT + expiration) — no login UI, no route guards.

## Public surface
- `useAuthStore()` — Zustand hook: `{ token, expiresAt, login, logout, isAuthenticated }`
- `useLoginMutation()` — `POST /api/auth/login`, on success writes to store
- `useLogoutMutation()` — `POST /api/auth/logout`, on settled clears store
- `readAuthToken()` — non-hook accessor for `request.ts` injection

## Cross-cutting wire-up
- On module load, `auth-store.ts` calls `configureRequest({ tokenProvider, onUnauthorized })` on `src/lib/request.ts` to attach `Authorization: Bearer <token>` on all outgoing `request()` calls and clear the store on 401.

## Persistence
- localStorage key: `issue-management-auth`
- Contains: `{ token, expiresAt }`
- Rehydrates automatically on page load via zustand `persist` middleware.

## AC coverage
- AC-005 (login error inline via FormMessage — this feature exposes the mutation; the FormMessage lives on the login page in T023)
- AC-006 (5-attempt freeze) — server side; login mutation just surfaces the 40101/42901 to the caller
- AC-007 (30-day JWT, localStorage) — server issues token; store persists it
- AC-304 (401 → cleared store) — via `onUnauthorized` hook; redirect happens in a separate route-guard task
