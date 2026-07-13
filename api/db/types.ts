/**
 * D1 row types — one interface per table, matching the columns declared in
 * `migrations/0001_init.sql`. `INTEGER` columns are `number`, `TEXT` columns
 * are `string`; nullable columns are `T | null` (never `undefined`, since D1
 * returns SQL NULL as JS null).
 */

// -----------------------------------------------------------------------------
// enums / narrow unions
// -----------------------------------------------------------------------------
export type IssueStatus = 'todo' | 'in_progress' | 'done' | 'archived'
export type IssuePriority = 'p0' | 'p1' | 'p2' | 'p3'
export type IssueSource = 'manual' | 'webhook'

/** SQLite boolean stored as 0 or 1. */
export type SqliteBool = 0 | 1

// -----------------------------------------------------------------------------
// projects
// -----------------------------------------------------------------------------
export interface ProjectRow {
  id: string
  name: string
  color: string
  is_inbox: SqliteBool
  sort_order: number
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// labels
// -----------------------------------------------------------------------------
export interface LabelRow {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// issues
// -----------------------------------------------------------------------------
export interface IssueRow {
  id: string
  project_id: string
  title: string
  body: string | null
  body_r2_key: string | null
  status: IssueStatus
  priority: IssuePriority
  due_date: string | null
  external_ref: string | null
  source: IssueSource
  source_name: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

// -----------------------------------------------------------------------------
// issue_labels (M2M)
// -----------------------------------------------------------------------------
export interface IssueLabelRow {
  issue_id: string
  label_id: string
}

// -----------------------------------------------------------------------------
// comments
// -----------------------------------------------------------------------------
export interface CommentRow {
  id: string
  issue_id: string
  body: string
  created_at: string
}

// -----------------------------------------------------------------------------
// webhook_logs
// -----------------------------------------------------------------------------
export interface WebhookLogRow {
  id: string
  source: string
  event_id: string
  event_type: string
  payload: string
  http_status: number
  error_summary: string | null
  issue_id: string | null
  received_at: string
}
