/**
 * Unit tests for api/lib/jwt.ts and api/lib/auth.ts.
 *
 * Covers: sign→verify happy path; exp boundary; signature tampering; payload
 * tampering; unsupported algs ("none", RS256, missing header); malformed shape;
 * KV blacklist rejection; KV.get throw → authenticate rejects (fail-closed).
 */
import { describe, it, expect } from 'vitest'
import { signJwt, verifyJwt, randomJti, JwtError, type JwtClaims } from '../../api/lib/jwt'
import { authenticate, AuthError, JWT_BLACKLIST_PREFIX } from '../../api/lib/auth'

const SECRET = 'test-jwt-secret-xxxxxxx'

function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

function claims(overrides: Partial<JwtClaims> = {}): JwtClaims {
  const iat = nowSec()
  return { sub: 'owner', iat, exp: iat + 3600, jti: randomJti(), ...overrides }
}

// Minimal KV mock — only needs `get`/`put` used by authenticate/revoke.
function makeKv(initial: Record<string, string> = {}, opts: { throwOnGet?: boolean } = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    get: async (key: string) => {
      if (opts.throwOnGet) throw new Error('KV unreachable')
      return store.get(key) ?? null
    },
    put: async (key: string, value: string) => {
      store.set(key, value)
    },
    _store: store,
  }
}

function makeCtx(token: string | null, kv: ReturnType<typeof makeKv>) {
  return {
    req: {
      header: (name: string) => {
        if (name.toLowerCase() === 'authorization' && token) return `Bearer ${token}`
        return undefined
      },
    },
    // Minimal env — only KV and JWT_SECRET are read.
    env: { KV: kv as unknown, JWT_SECRET: SECRET } as unknown,
  } as never
}

describe('jwt.signJwt / verifyJwt', () => {
  it('signs and verifies a happy-path token', async () => {
    const c = claims()
    const token = await signJwt(SECRET, c)
    const decoded = await verifyJwt(SECRET, token)
    expect(decoded).toEqual(c)
  })

  it('rejects a token whose exp is in the past', async () => {
    const token = await signJwt(SECRET, claims({ exp: nowSec() - 1 }))
    await expect(verifyJwt(SECRET, token)).rejects.toMatchObject({ reason: 'expired' })
  })

  it('rejects a token whose exp equals now (exp <= now)', async () => {
    const token = await signJwt(SECRET, claims({ exp: nowSec() }))
    await expect(verifyJwt(SECRET, token)).rejects.toMatchObject({ reason: 'expired' })
  })

  it('accepts a token with exp comfortably in the future', async () => {
    const token = await signJwt(SECRET, claims({ exp: nowSec() + 60 }))
    await expect(verifyJwt(SECRET, token)).resolves.toBeDefined()
  })

  it('rejects a token with a tampered payload (signature mismatch)', async () => {
    const token = await signJwt(SECRET, claims())
    // Swap the payload segment for a longer-lifetime claim.
    const forged = JSON.stringify({ ...claims({ exp: nowSec() + 999999 }) })
    const b64 = btoa(forged).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    const [h, , s] = token.split('.')
    await expect(verifyJwt(SECRET, `${h}.${b64}.${s}`)).rejects.toMatchObject({
      reason: 'signature',
    })
  })

  it('rejects a token with a tampered signature', async () => {
    const token = await signJwt(SECRET, claims())
    const [h, p, s] = token.split('.')
    // Flip one hex byte in the sig.
    const bad = s.slice(0, -2) + (s.endsWith('AA') ? 'BB' : 'AA')
    await expect(verifyJwt(SECRET, `${h}.${p}.${bad}`)).rejects.toBeInstanceOf(JwtError)
  })

  it('rejects a token with alg: none (algorithm downgrade)', async () => {
    const header = btoa('{"alg":"none","typ":"JWT"}')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
    const payload = btoa(JSON.stringify(claims()))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
    // Empty signature — classic 'none' attack.
    await expect(verifyJwt(SECRET, `${header}.${payload}.`)).rejects.toMatchObject({
      reason: 'unsupported',
    })
  })

  it('rejects a token with alg: RS256 (unsupported)', async () => {
    const header = btoa('{"alg":"RS256","typ":"JWT"}')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
    const payload = btoa(JSON.stringify(claims()))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
    await expect(verifyJwt(SECRET, `${header}.${payload}.deadbeef`)).rejects.toMatchObject(
      { reason: 'unsupported' },
    )
  })

  it('rejects malformed tokens (wrong segment count, non-base64)', async () => {
    await expect(verifyJwt(SECRET, 'a.b')).rejects.toMatchObject({ reason: 'malformed' })
    await expect(verifyJwt(SECRET, 'onlyonepart')).rejects.toMatchObject({
      reason: 'malformed',
    })
  })
})

describe('auth.authenticate (KV blacklist)', () => {
  it('accepts a valid token when jti is NOT blacklisted', async () => {
    const c = claims()
    const token = await signJwt(SECRET, c)
    const kv = makeKv()
    const decoded = await authenticate(makeCtx(token, kv))
    expect(decoded.jti).toBe(c.jti)
  })

  it('rejects a valid token whose jti IS in the KV blacklist (revoked)', async () => {
    const c = claims()
    const token = await signJwt(SECRET, c)
    const kv = makeKv({ [JWT_BLACKLIST_PREFIX + c.jti]: '1' })
    await expect(authenticate(makeCtx(token, kv))).rejects.toMatchObject({
      reason: 'revoked',
    })
  })

  it('rejects when Authorization header is missing', async () => {
    const kv = makeKv()
    await expect(authenticate(makeCtx(null, kv))).rejects.toMatchObject({
      reason: 'missing',
    })
  })

  it('rejects when signature is invalid (maps to AuthError.invalid)', async () => {
    const token = await signJwt('wrong-secret', claims())
    const kv = makeKv()
    await expect(authenticate(makeCtx(token, kv))).rejects.toMatchObject({
      reason: 'invalid',
    })
  })

  it('rejects when token is expired (maps to AuthError.expired)', async () => {
    const token = await signJwt(SECRET, claims({ exp: nowSec() - 1 }))
    const kv = makeKv()
    await expect(authenticate(makeCtx(token, kv))).rejects.toMatchObject({
      reason: 'expired',
    })
  })

  it('fail-closed: propagates KV.get errors instead of degrading to accept', async () => {
    const c = claims()
    const token = await signJwt(SECRET, c)
    const kv = makeKv({}, { throwOnGet: true })
    // If KV throws, authenticate must NOT swallow it into a success. Any
    // unhandled throw here signals to the caller (auth-guard → 500) instead of
    // silently authorizing the request.
    await expect(authenticate(makeCtx(token, kv))).rejects.toThrow()
    // And specifically NOT an AuthError — because it's an infra fault, not a
    // credential fault. The caller must decide whether to map to 401 or 5xx.
    await expect(authenticate(makeCtx(token, kv))).rejects.not.toBeInstanceOf(AuthError)
  })
})
