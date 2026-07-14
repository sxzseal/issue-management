/**
 * Unit tests for api/lib/rate-limit.ts.
 *
 * Covers: window-scoped counting (n hits ok, n+1 blocked); window expiry resets
 * count; TTL clamp to KV's 60-second minimum; loginFailure freeze that refreshes
 * TTL on additional attempts.
 */
import { describe, it, expect, vi } from 'vitest'
import { rateLimit, rateLimitLoginFailure } from '../../api/lib/rate-limit'

interface KvEntry {
  value: string
  ttl?: number
  writtenAt: number
}

/**
 * Minimal in-memory KV mock. `get` returns null for expired entries so we can
 * assert window rollover; `put` records TTL for clamp assertions.
 */
function makeKv() {
  const store = new Map<string, KvEntry>()
  const puts: Array<{ key: string; ttl: number | undefined }> = []
  let now = 1_700_000_000_000 // fixed base epoch ms so tests are deterministic
  return {
    _advanceMs(ms: number) {
      now += ms
    },
    _currentMs() {
      return now
    },
    get puts() {
      return puts
    },
    kv: {
      get: vi.fn(async (key: string) => {
        const entry = store.get(key)
        if (!entry) return null
        if (entry.ttl !== undefined && now - entry.writtenAt > entry.ttl * 1000) {
          store.delete(key)
          return null
        }
        return entry.value
      }),
      put: vi.fn(async (key: string, value: string, opts?: { expirationTtl?: number }) => {
        puts.push({ key, ttl: opts?.expirationTtl })
        store.set(key, { value, ttl: opts?.expirationTtl, writtenAt: now })
      }),
      // Unused by rate-limit, but the KVNamespace type expects them.
      delete: vi.fn(),
      list: vi.fn(),
    } as never,
  }
}

// Pin Date.now to the mock's clock so rate-limit's window arithmetic is
// deterministic across the test file.
function withMockedNow<T>(getMs: () => number, fn: () => Promise<T>): Promise<T> {
  const spy = vi.spyOn(Date, 'now').mockImplementation(getMs)
  return fn().finally(() => spy.mockRestore())
}

describe('rateLimit (fixed window)', () => {
  it('allows the first N hits within the window and blocks the N+1th', async () => {
    const m = makeKv()
    await withMockedNow(m._currentMs, async () => {
      const results = []
      for (let i = 0; i < 5; i++) {
        results.push(await rateLimit(m.kv, 'k', 5, 60))
      }
      const blocked = await rateLimit(m.kv, 'k', 5, 60)
      expect(results.every((r) => r.ok)).toBe(true)
      expect(results.map((r) => r.count)).toEqual([1, 2, 3, 4, 5])
      expect(blocked.ok).toBe(false)
      expect(blocked.remaining).toBe(0)
    })
  })

  it('resets the counter after the window elapses', async () => {
    const m = makeKv()
    await withMockedNow(m._currentMs, async () => {
      const r1 = await rateLimit(m.kv, 'k', 2, 60)
      const r2 = await rateLimit(m.kv, 'k', 2, 60)
      expect(r1.ok && r2.ok).toBe(true)
      const blocked = await rateLimit(m.kv, 'k', 2, 60)
      expect(blocked.ok).toBe(false)

      // Advance past the window; entry should be expired on next get.
      m._advanceMs(61_000)
      const r3 = await rateLimit(m.kv, 'k', 2, 60)
      expect(r3.ok).toBe(true)
      expect(r3.count).toBe(1)
    })
  })

  it('clamps expirationTtl to the KV 60-second minimum', async () => {
    const m = makeKv()
    await withMockedNow(m._currentMs, async () => {
      // Ask for a 10s window — implementation must clamp put(ttl) to 60.
      await rateLimit(m.kv, 'k', 3, 10)
      const first = m.puts[0]
      expect(first).toBeDefined()
      expect(first!.ttl).toBeGreaterThanOrEqual(60)
    })
  })

  it('preserves the original window across increments (no TTL extension on plain hits)', async () => {
    const m = makeKv()
    await withMockedNow(m._currentMs, async () => {
      await rateLimit(m.kv, 'k', 10, 120)
      const firstTtl = m.puts[0]!.ttl
      m._advanceMs(30_000) // 30s in
      await rateLimit(m.kv, 'k', 10, 120)
      const secondTtl = m.puts[1]!.ttl
      // Second put's TTL should reflect remaining window (~90s), not full 120.
      expect(secondTtl).toBeLessThan(firstTtl!)
      expect(secondTtl).toBeGreaterThanOrEqual(60) // still clamped floor
    })
  })

  it('reads limit + resetSec correctly on a blocked call', async () => {
    const m = makeKv()
    await withMockedNow(m._currentMs, async () => {
      await rateLimit(m.kv, 'k', 1, 60)
      const blocked = await rateLimit(m.kv, 'k', 1, 60)
      expect(blocked.ok).toBe(false)
      expect(blocked.limit).toBe(1)
      expect(blocked.remaining).toBe(0)
      expect(blocked.resetSec).toBeGreaterThan(0)
      expect(blocked.resetSec).toBeLessThanOrEqual(60)
    })
  })
})

describe('rateLimitLoginFailure (sliding freeze)', () => {
  it('counts up to limit-1, then freezes on the limit-th attempt', async () => {
    const m = makeKv()
    await withMockedNow(m._currentMs, async () => {
      const r1 = await rateLimitLoginFailure(m.kv, 'login:x', 3, 900)
      const r2 = await rateLimitLoginFailure(m.kv, 'login:x', 3, 900)
      const r3 = await rateLimitLoginFailure(m.kv, 'login:x', 3, 900)
      expect([r1.ok, r2.ok, r3.ok]).toEqual([true, true, false])
      expect(r3.count).toBe(3)
    })
  })

  it('refreshes the freeze TTL on every subsequent attempt (sliding window)', async () => {
    const m = makeKv()
    await withMockedNow(m._currentMs, async () => {
      // Reach freeze.
      await rateLimitLoginFailure(m.kv, 'login:x', 2, 300)
      await rateLimitLoginFailure(m.kv, 'login:x', 2, 300)
      const firstFreezePut = m.puts[m.puts.length - 1]!

      m._advanceMs(60_000) // 1 min into freeze
      await rateLimitLoginFailure(m.kv, 'login:x', 2, 300)
      const secondFreezePut = m.puts[m.puts.length - 1]!

      // Both freeze puts write freezeSec-worth of TTL (clamped ≥ 60).
      expect(firstFreezePut.ttl).toBeGreaterThanOrEqual(60)
      expect(secondFreezePut.ttl).toBeGreaterThanOrEqual(60)
      // Freeze is refreshed — second put is another full freeze TTL, not the
      // remaining time of the first one.
      expect(secondFreezePut.ttl).toBe(firstFreezePut.ttl)
    })
  })
})
