/**
 * Pagination helpers — normalize user input to SQL OFFSET/LIMIT and assemble
 * the `PaginatedData<T>` envelope shape. See AC-154 (page_size <= 100).
 */

export const DEFAULT_PAGE_SIZE = 20 as const
export const MAX_PAGE_SIZE = 100 as const

export interface PaginationInput {
  page?: number
  page_size?: number
}

export interface Pagination {
  page: number
  pageSize: number
  offset: number
  limit: number
}

/**
 * Normalize page + page_size from user input.
 * - page: floor to >= 1
 * - page_size: clamp to [1, MAX_PAGE_SIZE]; default DEFAULT_PAGE_SIZE
 * Non-numeric inputs default to safe values (no throw — the underlying zod schema
 * on the route already validates strict types; this helper is for constructing
 * SQL OFFSET/LIMIT once validation passed).
 */
export function parsePagination(
  input: PaginationInput | null | undefined,
): Pagination {
  const page = Math.max(1, Math.floor(Number(input?.page ?? 1)) || 1)
  const raw = Number(input?.page_size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(raw)))
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize }
}

export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

/** Assemble a PaginatedData<T> envelope-ready payload. */
export function paginate<T>(
  list: T[],
  total: number,
  pagination: Pagination,
): Paginated<T> {
  return { list, total, page: pagination.page, page_size: pagination.pageSize }
}
