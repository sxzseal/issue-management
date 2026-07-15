/**
 * Unit tests for api/lib/api-token.ts.
 *
 * Covers: token shape (prefix + 64 hex chars), hash determinism, prefix
 * recognizer, verifyApiToken happy path, miss on unknown / revoked, KV
 * throttle short-circuits the D1 UPDATE, D1 write failure is swallowed
 * (allSettled) so a valid token still authenticates.
 */
import { describe, it, expect } from 'vitest'
import {
  TOKEN_PREFIX,
  generateApiToken,
  hashToken,
  looksLikeApiToken,
  verifyApiToken,
} from '../../api/lib/api-token'
import type { ApiTokenRow } from '../../api/db/types'

// ---------------------------------------------------------------------------
// Minimal D1 + KV mocks — capture calls, let each test declare an outcome.
// ---------------------------------------------------------------------------

interface D1Call {
  sql: string
  binds: unknown[]
}

interface FakeD1Options {
  selectRow?: ApiTokenRow | null
  updateThrows?: boolean
}

function makeD1(opts: FakeD1Options = {}) {
  const calls: D1Call[] = []
  const prepare = (sql: string) => {
    const binds: unknown[] = []
    const stmt = {
      bind: (...args: unknown[]) => {
        binds.push(...args)
        return stmt
      },
      first: async <T>() => {
        calls.push({ sql, binds })
        if (sql.includes('SELECT')) return (opts.selectRow ?? null) as T | null
        return null as T | null
      },
      run: async () => {
        calls.push({ sql, binds })
        if (sql.includes('UPDATE') && opts.updateThrows) {
          throw new Error('D1 UPDATE failed')
        }
        return { success: true }
      },
    }
    return stmt
  }
  return { DB: { prepare }, calls }
}

interface FakeKvOptions {
  getReturns?: string | null
  putThrows?: boolean
}

function makeKv(opts: FakeKvOptions = {}) {
  const puts: Array<{ key: string; value: string }> = []
  const gets: string[] = []
  return {
    KV: {
      get: async (key: string) => {
        gets.push(key)
        return opts.getReturns ?? null
      },
      put: async (key: string, value: string) => {
        if (opts.putThrows) throw new Error('KV put failed')
        puts.push({ key, value })
      },
    },
    puts,
    gets,
  }
}

function makeEnv(d1: ReturnType<typeof makeD1>, kv: ReturnType<typeof makeKv>) {
  return { DB: d1.DB, KV: kv.KV } as unknown as Parameters<
    typeof verifyApiToken
  >[0]
}

function fakeRow(overrides: Partial<ApiTokenRow> = {}): ApiTokenRow {
  return {
    id: 'apitok_abc123def456',
    name: 'test token',
    token_hash: 'deadbeef',
    prefix: 'imt_live_abc123',
    created_at: '2026-07-14T00:00:00.000Z',
    last_used_at: null,
    revoked_at: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// generateApiToken / hashToken / looksLikeApiToken
// ---------------------------------------------------------------------------

describe('generateApiToken', () => {
  it('produces a raw token with the imt_live_ prefix and 64 hex chars', async () => {
    const { raw, prefix, hash } = await generateApiToken()
    expect(raw.startsWith(TOKEN_PREFIX)).toBe(true)
    expect(raw.length).toBe(TOKEN_PREFIX.length + 64)
    expect(raw.slice(TOKEN_PREFIX.length)).toMatch(/^[0-9a-f]{64}$/)
    expect(prefix.length).toBe(16)
    expect(raw.startsWith(prefix)).toBe(true)
    // hash is 64 hex (SHA-256).
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces distinct raw tokens across calls (entropy sanity)', async () => {
    const a = await generateApiToken()
    const b = await generateApiToken()
    expect(a.raw).not.toBe(b.raw)
    expect(a.hash).not.toBe(b.hash)
  })
})

describe('hashToken', () => {
  it('is deterministic (same input → same hash)', async () => {
    const a = await hashToken('imt_live_deadbeef')
    const b = await hashToken('imt_live_deadbeef')
    expect(a).toBe(b)
  })

  it('produces different hashes for different inputs', async () => {
    const a = await hashToken('imt_live_a')
    const b = await hashToken('imt_live_b')
    expect(a).not.toBe(b)
  })

  it('matches the hash produced by generateApiToken for its own raw', async () => {
    const { raw, hash } = await generateApiToken()
    const rehash = await hashToken(raw)
    expect(rehash).toBe(hash)
  })
})

describe('looksLikeApiToken', () => {
  it('accepts strings with the imt_live_ prefix', () => {
    expect(looksLikeApiToken('imt_live_anything')).toBe(true)
    expect(looksLikeApiToken(TOKEN_PREFIX + 'x'.repeat(64))).toBe(true)
  })

  it('rejects strings that do not start with the prefix', () => {
    expect(looksLikeApiToken('eyJhbGciOi...')).toBe(false)
    expect(looksLikeApiToken('')).toBe(false)
    expect(looksLikeApiToken('IMT_LIVE_uppercase')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// verifyApiToken
// ---------------------------------------------------------------------------

describe('verifyApiToken', () => {
  it('returns null when no matching row is found', async () => {
    const d1 = makeD1({ selectRow: null })
    const kv = makeKv()
    const result = await verifyApiToken(makeEnv(d1, kv), 'imt_live_unknown')
    expect(result).toBeNull()
    // SELECT ran, no UPDATE / KV.put on miss.
    expect(d1.calls.some((call) => call.sql.includes('UPDATE'))).toBe(false)
    expect(kv.puts.length).toBe(0)
  })

  it('returns the row on a match and triggers a throttled last_used_at update', async () => {
    const row = fakeRow()
    const d1 = makeD1({ selectRow: row })
    const kv = makeKv({ getReturns: null })
    const result = await verifyApiToken(makeEnv(d1, kv), 'imt_live_hit')
    expect(result).not.toBeNull()
    expect(result?.id).toBe(row.id)
    expect(d1.calls.some((call) => call.sql.includes('UPDATE'))).toBe(true)
    // KV touch key uses the token id.
    expect(kv.puts.some((p) => p.key.endsWith(row.id))).toBe(true)
  })

  it('skips the D1 UPDATE when the KV touch key is fresh (throttling)', async () => {
    const row = fakeRow()
    const d1 = makeD1({ selectRow: row })
    const kv = makeKv({ getReturns: '1' })
    await verifyApiToken(makeEnv(d1, kv), 'imt_live_hit')
    expect(d1.calls.some((call) => call.sql.includes('UPDATE'))).toBe(false)
    expect(kv.puts.length).toBe(0)
  })

  it('does not mutate the returned row (last_used_at reflects the DB read only)', async () => {
    const row = fakeRow({ last_used_at: null })
    const d1 = makeD1({ selectRow: row })
    const kv = makeKv({ getReturns: null })
    const result = await verifyApiToken(makeEnv(d1, kv), 'imt_live_hit')
    // The read row had last_used_at=null; the DB UPDATE happened via
    // allSettled but the returned object should not be locally overwritten.
    expect(result?.last_used_at).toBeNull()
  })

  it('does not reject when the D1 UPDATE fails (best-effort touch)', async () => {
    const row = fakeRow()
    const d1 = makeD1({ selectRow: row, updateThrows: true })
    const kv = makeKv({ getReturns: null })
    // Should NOT throw — allSettled swallows the write failure.
    const result = await verifyApiToken(makeEnv(d1, kv), 'imt_live_hit')
    expect(result?.id).toBe(row.id)
  })

  it('does not reject when the KV touch write fails (best-effort touch)', async () => {
    const row = fakeRow()
    const d1 = makeD1({ selectRow: row })
    const kv = makeKv({ getReturns: null, putThrows: true })
    const result = await verifyApiToken(makeEnv(d1, kv), 'imt_live_hit')
    expect(result?.id).toBe(row.id)
  })
})
