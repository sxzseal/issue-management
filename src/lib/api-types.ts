/**
 * Shared TypeScript models used by the frontend to talk to the Worker API.
 *
 * These are the canonical wire types — they mirror D1 row shapes but with
 * SQLite quirks normalized (INTEGER 0/1 -> boolean, JOINed labels included,
 * ISO 8601 UTC strings for all timestamps).
 *
 * Kept self-contained: NEVER import from `@api/*` — the FE and Worker
 * modules live in different runtime environments.
 */

export type IssueStatus = 'todo' | 'in_progress' | 'done' | 'archived'
export type IssuePriority = 'p0' | 'p1' | 'p2' | 'p3'
export type IssueSource = 'manual' | 'api'
export type ProjectStatus = 'planning' | 'active' | 'archived'

export interface Project {
  id: string
  name: string
  color: string
  /** Deserialized from D1 INTEGER 0/1 on the Worker side. */
  is_inbox: boolean
  sort_order: number
  status: ProjectStatus
  /** ISO 8601 UTC; set only when status === 'archived'. */
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface Issue {
  id: string
  project_id: string
  title: string
  /** Short body preview; null when the full body lives in R2. */
  body: string | null
  body_r2_key: string | null
  status: IssueStatus
  priority: IssuePriority
  due_date: string | null
  external_ref: string | null
  source: IssueSource
  source_name: string | null
  /** Populated by the API layer via JOIN on issue_labels. */
  labels: Label[]
  created_at: string
  updated_at: string
  archived_at: string | null
}

/**
 * Full issue payload — `GET /api/issues/:id` merges the R2 body (when
 * present) into `body_full` so the client sees one canonical string.
 */
export interface IssueDetail extends Issue {
  body_full: string
}

export interface Comment {
  id: string
  issue_id: string
  body: string
  created_at: string
}

/**
 * Uploaded attachment (image or file). `url` is a Worker-served relative
 * path — the frontend must fetch it with the Bearer token; `<AuthedImg>`
 * turns the response into a blob URL for rendering.
 */
export interface Attachment {
  id: string
  issue_id: string
  filename: string
  mime: string
  size_bytes: number
  uploaded_at: string
  /** Relative path served by the Worker, e.g. `/api/attachments/at_xxx`. */
  url: string
}

/**
 * API token — long-lived bearer credential for external AI / script clients.
 * `revoked_at` is null while active; soft-delete keeps a paper trail so past
 * `last_used_at` and provenance stay visible in the settings UI.
 */
export interface ApiToken {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

/**
 * Response of `POST /api/settings/api-tokens` — includes the raw `token`
 * exactly once. Subsequent list reads return {@link ApiToken} (no raw).
 */
export interface CreatedApiToken extends ApiToken {
  token: string
}

export interface PaginationParams {
  /** 1-based page index; defaults to 1. */
  page?: number
  /** Items per page; defaults to 20, capped at 100. */
  page_size?: number
}

export interface ListParams extends PaginationParams {
  sort?: string
  order?: 'asc' | 'desc'
  q?: string
}

export interface IssueListParams extends ListParams {
  project_id?: string
  status?: IssueStatus | IssueStatus[]
  priority?: IssuePriority | IssuePriority[]
  labels?: string[]
  due_from?: string
  due_to?: string
}
