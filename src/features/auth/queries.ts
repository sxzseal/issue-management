/**
 * Auth feature — data-fetch queries.
 *
 * v1 has no server-fetched auth state; the JWT + expires_at are stored in
 * localStorage via useAuthStore. When /api/auth/me lands later, expose a
 * query here for it.
 */
export const authQueries = {} as const
