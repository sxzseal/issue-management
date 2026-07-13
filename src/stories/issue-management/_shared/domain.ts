/**
 * issue-management 原型阶段共享类型与常量
 *
 * 来源：.loop/prd.md §7 领域模型 + .loop/api-contracts.json
 * 供 5 个 feature 的 stories / fixtures / handlers 共同引用。
 */

export type IssueStatus = 'todo' | 'in_progress' | 'done' | 'archived'
export type IssuePriority = 'p0' | 'p1' | 'p2' | 'p3'
export type IssueSource = 'web' | 'webhook'

export interface Project {
  id: string
  name: string
  color: string
  issue_count: number
  archived: boolean
  created_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Issue {
  id: string
  project_id: string
  title: string
  body: string
  body_r2_key: string | null
  status: IssueStatus
  priority: IssuePriority
  label_ids: string[]
  due_date: string | null
  source: IssueSource
  webhook_ref: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  issue_id: string
  body: string
  created_at: string
}

export const STATUS_LABEL: Record<IssueStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '已完成',
  archived: '归档',
}

export const PRIORITY_LABEL: Record<IssuePriority, string> = {
  p0: 'P0 紧急',
  p1: 'P1 高',
  p2: 'P2 中',
  p3: 'P3 低',
}

export const PRIORITY_SHORT: Record<IssuePriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
}

export const SOURCE_LABEL: Record<IssueSource, string> = {
  web: '手动',
  webhook: 'Webhook',
}

export const STATUS_ORDER: IssueStatus[] = ['todo', 'in_progress', 'done', 'archived']
export const PRIORITY_ORDER: IssuePriority[] = ['p0', 'p1', 'p2', 'p3']

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj_inbox',
    name: 'Inbox',
    color: '#64748b',
    issue_count: 4,
    archived: false,
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'proj_site',
    name: 'personal-site',
    color: '#3b82f6',
    issue_count: 7,
    archived: false,
    created_at: '2026-05-02T00:00:00Z',
  },
  {
    id: 'proj_plugin',
    name: 'obsidian-plugin',
    color: '#8b5cf6',
    issue_count: 5,
    archived: false,
    created_at: '2026-05-03T00:00:00Z',
  },
  {
    id: 'proj_forge',
    name: 'ai-forge',
    color: '#f59e0b',
    issue_count: 9,
    archived: false,
    created_at: '2026-05-04T00:00:00Z',
  },
  {
    id: 'proj_notes',
    name: 'claude-code-notes',
    color: '#10b981',
    issue_count: 3,
    archived: false,
    created_at: '2026-05-05T00:00:00Z',
  },
]

export const MOCK_LABELS: Label[] = [
  { id: 'lbl_bug', name: 'bug', color: '#ef4444', created_at: '2026-05-01T00:00:00Z' },
  { id: 'lbl_feature', name: 'feature', color: '#3b82f6', created_at: '2026-05-01T00:00:00Z' },
  { id: 'lbl_refactor', name: 'refactor', color: '#8b5cf6', created_at: '2026-05-01T00:00:00Z' },
  { id: 'lbl_docs', name: 'docs', color: '#10b981', created_at: '2026-05-01T00:00:00Z' },
  { id: 'lbl_debt', name: 'tech-debt', color: '#f59e0b', created_at: '2026-05-01T00:00:00Z' },
  { id: 'lbl_someday', name: 'someday', color: '#94a3b8', created_at: '2026-05-01T00:00:00Z' },
]

export function projectById(id: string): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id)
}

export function labelById(id: string): Label | undefined {
  return MOCK_LABELS.find((l) => l.id === id)
}

export function labelsByIds(ids: string[]): Label[] {
  return ids.map(labelById).filter((l): l is Label => Boolean(l))
}

export const BRAND = {
  productName: 'Issue',
  productNameLong: 'Issue 管理平台',
  tagline: '跨项目 issue 的默认收件箱',
}
