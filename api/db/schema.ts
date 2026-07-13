/**
 * Table name constants — the single source of truth for referring to
 * D1 tables from application code. The raw SQL schema lives in
 * `migrations/0001_init.sql`; this module only re-exports names so
 * TypeScript callers cannot mistype a table.
 */
export const TABLES = {
  projects: 'projects',
  labels: 'labels',
  issues: 'issues',
  issueLabels: 'issue_labels',
  comments: 'comments',
  webhookLogs: 'webhook_logs',
} as const

export type TableName = (typeof TABLES)[keyof typeof TABLES]
