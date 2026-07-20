/**
 * Security response headers.
 *
 * Applied to every /api response (and any HTML that happens to flow through
 * the Worker). SPA assets are served by Cloudflare Pages; setting HSTS/CSP on
 * API responses still hardens direct browser navigation and iframe embeds.
 *
 * Header rationale:
 * - X-Frame-Options: DENY — no iframe embedding (Clickjacking of /settings/*
 *   actions like rotate-secret).
 * - X-Content-Type-Options: nosniff — browsers must trust Content-Type; blocks
 *   MIME-sniffing based script injection.
 * - Referrer-Policy: no-referrer — issue IDs must not leak to third parties
 *   via outbound links from the app.
 * - Strict-Transport-Security — force HTTPS for 1y on the API origin.
 * - Content-Security-Policy — strict self-only; extend `img-src` to `data:`
 *   for inline SVG lucide icons and future avatar fallbacks, and to `blob:` so
 *   `<AuthedImg>` can render authenticated attachments via `URL.createObjectURL`.
 * - frame-ancestors 'none' — redundant with XFO for modern browsers but keeps
 *   old ones covered.
 */
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'

const CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "connect-src 'self'; " +
  "img-src 'self' data: blob:; " +
  "style-src 'self' 'unsafe-inline'; " +
  "font-src 'self' data:; " +
  "frame-ancestors 'none'; " +
  "object-src 'none'; " +
  "base-uri 'self'"

export function securityHeaders(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    await next()
    const h = c.res.headers
    h.set('X-Frame-Options', 'DENY')
    h.set('X-Content-Type-Options', 'nosniff')
    h.set('Referrer-Policy', 'no-referrer')
    h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    h.set('Content-Security-Policy', CSP)
  }
}
