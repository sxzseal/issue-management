/**
 * 统一前端请求封装
 *
 * 所有前端数据请求走 request<T>()，不直接用裸 fetch：
 *   - 自动解析后端 ApiResponse<T> 信封
 *   - status_code !== 0 时抛 RequestError，由调用方或全局错误边界处理
 *   - HTTP 401 抛 UnauthorizedError，便于上层拦截跳转登录
 *
 * 不引入额外依赖（如 ofetch），保持轻量。需要时可替换为 ofetch。
 */
import type { ApiResponse } from './api-response'

export class RequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly httpStatus: number,
  ) {
    super(message)
    this.name = 'RequestError'
  }
}

export class UnauthorizedError extends RequestError {
  constructor(message = '未授权') {
    super(401, message, 401)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Extract a user-facing message from a mutation error, falling back to the
 * supplied string. Consumed by feature `mutations.ts` files so they don't each
 * reimplement the same instanceof check.
 */
export function humanError(e: unknown, fallback: string): string {
  if (e instanceof RequestError) return e.message || fallback
  if (e instanceof Error && e.message) return e.message
  return fallback
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  baseURL?: string
}

/**
 * Injection points for cross-cutting concerns (auth token, 401 handling).
 *
 * Kept as module-scoped setters so `src/lib/request.ts` avoids depending on
 * higher layers (features). Configured from `src/features/auth/auth-store.ts`
 * at module-load time.
 */
let tokenProvider: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

export function configureRequest(config: {
  tokenProvider?: () => string | null
  onUnauthorized?: () => void
}): void {
  if (config.tokenProvider) tokenProvider = config.tokenProvider
  if (config.onUnauthorized) onUnauthorized = config.onUnauthorized
}

function buildURL(
  path: string,
  query?: RequestOptions['query'],
  baseURL?: string,
): string {
  const base =
    baseURL ??
    (typeof window === 'undefined'
      ? 'http://localhost'
      : window.location.origin)
  const url = new URL(path, base)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  if (baseURL) {
    return url.toString()
  }
  return url.pathname + url.search
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { query, body, baseURL, headers, ...rest } = options
  const mergedHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  // Only send Content-Type on JSON bodies — bodyless requests can stay CORS-safe
  // (avoids a preflight against the vite proxy in dev). FormData must not carry
  // an explicit Content-Type so the browser can inject its multipart boundary.
  if (
    body !== undefined &&
    !isFormData &&
    !('Content-Type' in mergedHeaders) &&
    !('content-type' in mergedHeaders)
  ) {
    mergedHeaders['Content-Type'] = 'application/json'
  }
  const token = tokenProvider?.()
  if (
    token &&
    !('Authorization' in mergedHeaders) &&
    !('authorization' in mergedHeaders)
  ) {
    mergedHeaders.Authorization = `Bearer ${token}`
  }
  const init: RequestInit = {
    ...rest,
    headers: mergedHeaders,
  }
  if (body !== undefined) {
    init.body = isFormData
      ? (body as FormData)
      : typeof body === 'string'
        ? body
        : JSON.stringify(body)
  }

  const response = await fetch(buildURL(path, query, baseURL), init)

  if (response.status === 401) {
    onUnauthorized?.()
    throw new UnauthorizedError()
  }

  if (response.status === 204) {
    return undefined as T
  }

  const parsed = (await response.json()) as ApiResponse<T>
  if (parsed.status_code !== 0) {
    throw new RequestError(
      parsed.status_code,
      parsed.message ?? 'Request failed',
      response.status,
    )
  }
  return parsed.data as T
}
