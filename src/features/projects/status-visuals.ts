/**
 * Shared visuals for project status.
 *
 * Consumed by the sidebar (grouping) and the manage dialog (badge + select).
 * Kept next to the queries/mutations so anything touching the projects feature
 * finds it here.
 */
import type { ProjectStatus } from '@/lib/api-types'

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'planning',
  'active',
  'archived',
]

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: '规划中',
  active: '进行中',
  archived: '已完成',
}

/** Tailwind classes for a filled swatch (project-manage badge left dot). */
export const PROJECT_STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  planning: 'bg-[hsl(var(--project-status-planning))]',
  active: 'bg-[hsl(var(--project-status-active))]',
  archived: 'bg-[hsl(var(--project-status-archived))]',
}

/** Tailwind classes for a text-tinted label. */
export const PROJECT_STATUS_TEXT_CLASS: Record<ProjectStatus, string> = {
  planning: 'text-[hsl(var(--project-status-planning))]',
  active: 'text-[hsl(var(--project-status-active))]',
  archived: 'text-[hsl(var(--project-status-archived))]',
}
