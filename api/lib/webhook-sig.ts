/**
 * HMAC-SHA256 signature verification for inbound webhooks.
 *
 * Header contract (see `.loop/api-contracts.json` — `POST /api/webhooks/issues`):
 *   X-Webhook-Signature: sha256=<64-hex-digest>
 *
 * Zero external dependencies — uses the WebCrypto `crypto.subtle` API
 * available in the Cloudflare Workers runtime.
 *
 * Timing-safe: after computing the expected HMAC, expected and provided
 * digests are byte-compared through an XOR-accumulator so mismatches take
 * constant time regardless of where they diverge.
 */

const HEX_DIGEST_RE = /^[0-9a-f]{64}$/i
const SIGNATURE_PREFIX = 'sha256='

const encoder = new TextEncoder()

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

function bytesToHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let out = ''
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, '0')
  }
  return out
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.toLowerCase()
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/**
 * Constant-time byte comparison.
 *
 * Returns true iff both arrays have the same length and every byte matches.
 * XOR-accumulator ensures the loop always runs the full length regardless of
 * where the first mismatch occurs.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

/**
 * Verify an HMAC-SHA256 signature over the raw request body.
 *
 * Expected header format: `sha256=<hex_digest>` where digest is 64 lowercase
 * hex chars (SHA-256 = 32 bytes). Bare `<hex_digest>` (no prefix) is also
 * accepted for lenient clients.
 *
 * Returns false for missing / malformed / mismatched signatures. A malformed
 * signature emits a `console.warn` so upstream logs surface protocol drift,
 * but never throws — routes convert the boolean into a `40302` envelope.
 */
export async function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  headerSig: string | null | undefined,
): Promise<boolean> {
  if (!headerSig) {
    return false
  }

  const trimmed = headerSig.trim()
  const digest = trimmed.startsWith(SIGNATURE_PREFIX)
    ? trimmed.slice(SIGNATURE_PREFIX.length)
    : trimmed

  if (!HEX_DIGEST_RE.test(digest)) {
    console.warn('webhook-sig: malformed signature header')
    return false
  }

  const key = await importHmacKey(secret)
  const expectedBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody),
  )

  const providedBytes = hexToBytes(digest)
  return timingSafeEqual(new Uint8Array(expectedBytes), providedBytes)
}

/**
 * Sign a body with the shared secret and return the raw hex digest
 * (no `sha256=` prefix). Callers prepend the prefix when composing the
 * header. Intended for dev tools / tests — production traffic is signed
 * by the source system.
 */
export async function signWebhookBody(
  secret: string,
  rawBody: string,
): Promise<string> {
  const key = await importHmacKey(secret)
  const bytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody),
  )
  return bytesToHex(bytes)
}

/**
 * Structured error for callers that prefer throw-based flow control.
 *
 * `verifyWebhookSignature` intentionally returns a boolean so route code
 * stays flat; this class is exported for use by higher-level helpers that
 * want to distinguish `missing` (no header at all) from `malformed`
 * (wrong shape) from `mismatch` (bad digest) when composing error
 * envelopes or metrics.
 */
export class WebhookSignatureError extends Error {
  public readonly reason: 'missing' | 'malformed' | 'mismatch'

  constructor(reason: 'missing' | 'malformed' | 'mismatch') {
    super(`webhook-sig: ${reason}`)
    this.name = 'WebhookSignatureError'
    this.reason = reason
  }
}
