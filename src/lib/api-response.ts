/**
 * Shared API response envelope types (Cloudflare Worker + frontend).
 *
 * status_code = 0 → business success; non-zero → business error.
 * data is nullable on error; message is human-readable copy on error.
 */
export interface ApiResponse<T> {
  status_code: number
  message?: string
  data: T | null
}

export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}
