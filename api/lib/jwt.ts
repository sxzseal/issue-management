/**
 * HS256 JWT sign / verify using WebCrypto only.
 *
 * Compact serialization: base64url(header) . base64url(payload) . base64url(sig).
 * Header is fixed `{"alg":"HS256","typ":"JWT"}` — any other `alg` is rejected.
 *
 * No external deps: relies on Cloudflare Workers' WebCrypto (`crypto.subtle`)
 * and `crypto.getRandomValues`. Times are unix seconds throughout.
 */

export interface JwtClaims {
  /** Fixed 'owner' for the single-user personal product. */
  sub: string
  /** Issued-at unix seconds. */
  iat: number
  /** Expiry unix seconds. */
  exp: number
  /** 22-char base64url random id; used as KV blacklist key on logout. */
  jti: string
}

export type JwtErrorReason = 'malformed' | 'signature' | 'expired' | 'unsupported'

export class JwtError extends Error {
  constructor(public readonly reason: JwtErrorReason) {
    super(`jwt: ${reason}`)
    this.name = 'JwtError'
  }
}

const HEADER_JSON = '{"alg":"HS256","typ":"JWT"}'
const HEADER_B64 = base64urlEncode(new TextEncoder().encode(HEADER_JSON))

/** Sign an HS256 JWT. Returns compact serialization `h.p.s`. */
export async function signJwt(secret: string, claims: JwtClaims): Promise<string> {
  const payloadJson = JSON.stringify(claims)
  const payloadB64 = base64urlEncode(new TextEncoder().encode(payloadJson))
  const signingInput = `${HEADER_B64}.${payloadB64}`
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  const sigB64 = base64urlEncode(new Uint8Array(sig))
  return `${signingInput}.${sigB64}`
}

/**
 * Verify signature + `exp`. Returns claims. Throws {@link JwtError} on any
 * failure. Does not check `nbf`/`iat` — signed tokens with future `iat` are
 * still accepted (only `exp` matters for expiry).
 */
export async function verifyJwt(secret: string, token: string): Promise<JwtClaims> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new JwtError('malformed')
  }
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string]

  let header: unknown
  try {
    header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64)))
  } catch {
    throw new JwtError('malformed')
  }
  if (!isJwtHeader(header)) {
    throw new JwtError('malformed')
  }
  if (header.alg !== 'HS256') {
    throw new JwtError('unsupported')
  }

  const key = await importHmacKey(secret)
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${headerB64}.${payloadB64}`)),
  )
  let provided: Uint8Array
  try {
    provided = base64urlDecode(sigB64)
  } catch {
    throw new JwtError('malformed')
  }
  if (!constantTimeEqual(expected, provided)) {
    throw new JwtError('signature')
  }

  let payload: unknown
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)))
  } catch {
    throw new JwtError('malformed')
  }
  if (!isJwtClaims(payload)) {
    throw new JwtError('malformed')
  }

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now) {
    throw new JwtError('expired')
  }
  return payload
}

/** Generate a URL-safe 22-char (128-bit) random jti. */
export function randomJti(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64urlEncode(bytes)
}

/* ---------- internals ---------- */

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i] as number)
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i)
  }
  return out
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= (a[i] as number) ^ (b[i] as number)
  }
  return diff === 0
}

function isJwtHeader(v: unknown): v is { alg: string; typ?: string } {
  return typeof v === 'object' && v !== null && typeof (v as { alg?: unknown }).alg === 'string'
}

function isJwtClaims(v: unknown): v is JwtClaims {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const o = v as Record<string, unknown>
  return (
    typeof o.sub === 'string' &&
    typeof o.iat === 'number' &&
    typeof o.exp === 'number' &&
    typeof o.jti === 'string'
  )
}
