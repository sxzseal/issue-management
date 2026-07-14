/**
 * Unit tests for api/lib/webhook-sig.ts.
 *
 * Covers: valid signature accepted; body tampering rejected; missing / malformed
 * header rejected; empty secret + empty body edge cases; timing-safe compare
 * rejects a same-length but non-matching hex sig.
 */
import { describe, it, expect } from 'vitest'
import { signWebhookBody, verifyWebhookSignature } from '../../api/lib/webhook-sig'

const SECRET = 'test-secret-abcdef'
const BODY = '{"event":"issue.created","id":"iss_1"}'

async function makeValidHeader(secret: string, body: string): Promise<string> {
  const hex = await signWebhookBody(secret, body)
  return `sha256=${hex}`
}

describe('verifyWebhookSignature', () => {
  it('accepts a valid sha256=<hex> signature over the raw body', async () => {
    const header = await makeValidHeader(SECRET, BODY)
    expect(await verifyWebhookSignature(SECRET, BODY, header)).toBe(true)
  })

  it('accepts a bare hex digest without the sha256= prefix', async () => {
    const hex = await signWebhookBody(SECRET, BODY)
    expect(await verifyWebhookSignature(SECRET, BODY, hex)).toBe(true)
  })

  it('rejects a valid sig when the body is tampered by one character', async () => {
    const header = await makeValidHeader(SECRET, BODY)
    const tampered = BODY.replace('iss_1', 'iss_2')
    expect(await verifyWebhookSignature(SECRET, tampered, header)).toBe(false)
  })

  it('rejects when the header is missing (null / undefined / empty string)', async () => {
    expect(await verifyWebhookSignature(SECRET, BODY, null)).toBe(false)
    expect(await verifyWebhookSignature(SECRET, BODY, undefined)).toBe(false)
    expect(await verifyWebhookSignature(SECRET, BODY, '')).toBe(false)
  })

  it('rejects a malformed header (non-hex, wrong length, junk)', async () => {
    expect(await verifyWebhookSignature(SECRET, BODY, 'sha256=nothex')).toBe(false)
    expect(await verifyWebhookSignature(SECRET, BODY, 'sha256=abcd')).toBe(false)
    expect(await verifyWebhookSignature(SECRET, BODY, 'sha256=' + 'z'.repeat(64))).toBe(false)
    expect(await verifyWebhookSignature(SECRET, BODY, 'garbage')).toBe(false)
  })

  it('rejects a well-formed but different-secret signature', async () => {
    const header = await makeValidHeader('other-secret', BODY)
    expect(await verifyWebhookSignature(SECRET, BODY, header)).toBe(false)
  })

  it('rejects a length-matching but content-mismatched digest (timing-safe path)', async () => {
    const hex = await signWebhookBody(SECRET, BODY)
    // Flip the last byte — same length, different bytes.
    const lastByte = hex.slice(-2)
    const flipped = hex.slice(0, -2) + (lastByte === 'ff' ? '00' : 'ff')
    expect(await verifyWebhookSignature(SECRET, BODY, `sha256=${flipped}`)).toBe(false)
  })

  it('handles empty body + valid sig', async () => {
    const header = await makeValidHeader(SECRET, '')
    expect(await verifyWebhookSignature(SECRET, '', header)).toBe(true)
  })

  it('rejects a request when the empty-string was never configured as a secret', async () => {
    // Node's WebCrypto (and the Workers runtime) rejects zero-length HMAC
    // keys at importKey time — a legitimate signature over '' cannot exist.
    // Verifying with an empty secret must therefore always fail, not throw
    // in a way that would appear as a success in a catch-all handler.
    await expect(
      verifyWebhookSignature('', BODY, 'sha256=' + 'a'.repeat(64)),
    ).rejects.toThrow()
  })

  it('accepts uppercase hex digits in the header', async () => {
    const hex = await signWebhookBody(SECRET, BODY)
    expect(
      await verifyWebhookSignature(SECRET, BODY, `sha256=${hex.toUpperCase()}`),
    ).toBe(true)
  })
})
