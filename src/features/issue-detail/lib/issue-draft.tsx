/**
 * IssueDraftProvider — page-level draft container for /issue/:id.
 *
 * Wraps the whole detail view. All editable widgets (title, body, status,
 * priority, project, labels, due_date) read from this context and stage
 * changes into a local `draft: Partial<UpdateIssueBody>`. Nothing is PATCHed
 * until the user hits 「保存」, which calls `commit()` — one round-trip.
 *
 * Guarantees:
 *   - `dirty` is true iff at least one draft field truly differs from remote.
 *     Toggling a field back to its remote value auto-removes it from draft
 *     (patchX comparators handle it).
 *   - Unsaved-changes guard: `beforeunload` covers browser close/reload. SPA
 *     internal navigation currently cannot be intercepted because the app
 *     uses declarative `<BrowserRouter>` — `useBlocker` requires a data
 *     router. Cancel confirms via <EditModeActions>. Migrating to a data
 *     router (and wiring `useBlocker`) is out of scope here.
 *   - `commit()` reuses `useUpdateIssueMutation` (optimistic + rollback), so
 *     the cache patching / label resolution / list+board invalidations stay
 *     centralized in one place.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useQuery, queryOptions } from '@tanstack/react-query'

import { request } from '@/lib/request'
import type {
  IssueDetail,
  IssuePriority,
  IssueStatus,
  Label,
} from '@/lib/api-types'
import type { UpdateIssueBody } from '@/lib/validators/issue'

import { useUpdateIssueMutation } from '../mutations'

const labelsListQuery = queryOptions({
  queryKey: ['labels', 'list'] as const,
  queryFn: () => request<Label[]>('/api/labels'),
  staleTime: 60_000,
})

type Draft = Partial<UpdateIssueBody>

export interface IssueDraftContextValue {
  mode: 'view' | 'edit'
  saving: boolean
  dirty: boolean
  // Current values — draft field if present, otherwise remote.
  title: string
  body: string
  status: IssueStatus
  priority: IssuePriority
  projectId: string
  labelIds: string[]
  labels: Label[]
  dueDate: string | null
  // Field mutators (skip write if value === remote to keep `dirty` honest).
  patchTitle: (v: string) => void
  patchBody: (v: string) => void
  patchStatus: (v: IssueStatus) => void
  patchPriority: (v: IssuePriority) => void
  patchProject: (v: string) => void
  patchLabels: (ids: string[]) => void
  patchDueDate: (v: string | null) => void
  // Mode transitions.
  enterEdit: () => void
  cancel: () => void
  commit: () => Promise<void>
}

const IssueDraftContext = createContext<IssueDraftContextValue | null>(null)

export function useIssueDraft(): IssueDraftContextValue {
  const v = useContext(IssueDraftContext)
  if (!v) {
    throw new Error('useIssueDraft must be used inside <IssueDraftProvider>')
  }
  return v
}

interface IssueDraftProviderProps {
  issue: IssueDetail
  children: ReactNode
}

function sameLabelIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

export function IssueDraftProvider({
  issue,
  children,
}: IssueDraftProviderProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draft, setDraft] = useState<Draft>({})
  const update = useUpdateIssueMutation()
  const saving = update.isPending

  // Labels cache is used to resolve draft.label_ids → Label[] for display.
  // The list is cached (60s stale) so this is essentially a cache read.
  const { data: allLabels } = useQuery(labelsListQuery)

  // Auto-drop draft fields that match the (possibly refetched) remote value.
  // This keeps `dirty` accurate if a server-side change lands mid-edit and
  // happens to equal what the user typed.
  useEffect(() => {
    setDraft((prev) => {
      const next: Draft = {}
      let changed = false
      for (const [k, v] of Object.entries(prev) as [keyof Draft, unknown][]) {
        if (fieldEqualsRemote(k, v, issue)) {
          changed = true
          continue
        }
        // Heterogeneous partial map: each key's value type is validated by
        // its dedicated `patchX` writer at the call site, so the reflection
        // here only preserves entries that already passed that gate.
        Object.assign(next, { [k]: v })
      }
      return changed ? next : prev
    })
  }, [issue])

  const dirty = Object.keys(draft).length > 0

  const patch = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) => {
      setDraft((prev) => {
        const next = { ...prev }
        if (fieldEqualsRemote(key, value, issue)) {
          delete next[key]
        } else {
          next[key] = value
        }
        return next
      })
    },
    [issue],
  )

  const enterEdit = useCallback(() => {
    setDraft({})
    setMode('edit')
  }, [])

  const cancel = useCallback(() => {
    setDraft({})
    setMode('view')
  }, [])

  const commit = useCallback(async () => {
    if (!Object.keys(draft).length) {
      setMode('view')
      return
    }
    try {
      await update.mutateAsync({ id: issue.id, body: draft })
      setDraft({})
      setMode('view')
    } catch {
      // mutation surfaces its own toast; stay in edit mode so retry works
    }
  }, [draft, issue.id, update])

  // Derived current values.
  const title = draft.title ?? issue.title
  const body = draft.body ?? issue.body_full
  const status = (draft.status ?? issue.status) as IssueStatus
  const priority = (draft.priority ?? issue.priority) as IssuePriority
  const projectId = draft.project_id ?? issue.project_id
  const dueDate =
    draft.due_date !== undefined ? (draft.due_date ?? null) : issue.due_date

  const labelIds = useMemo(
    () => draft.label_ids ?? issue.labels.map((l) => l.id),
    [draft.label_ids, issue.labels],
  )
  const labels = useMemo<Label[]>(() => {
    if (draft.label_ids === undefined) return issue.labels
    const byId = new Map<string, Label>()
    for (const l of allLabels ?? []) byId.set(l.id, l)
    // Ensure any legacy labels still shown on the issue but missing from the
    // global list still render (defensive — shouldn't normally happen).
    for (const l of issue.labels) if (!byId.has(l.id)) byId.set(l.id, l)
    return draft.label_ids
      .map((id) => byId.get(id))
      .filter((l): l is Label => l !== undefined)
  }, [draft.label_ids, issue.labels, allLabels])

  // Nav guard: `beforeunload` covers tab close / reload; SPA internal nav is
  // not intercepted (needs a data router — see the file-level doc).
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const value = useMemo<IssueDraftContextValue>(
    () => ({
      mode,
      saving,
      dirty,
      title,
      body,
      status,
      priority,
      projectId,
      labelIds,
      labels,
      dueDate,
      patchTitle: (v) => patch('title', v),
      patchBody: (v) => patch('body', v),
      patchStatus: (v) => patch('status', v),
      patchPriority: (v) => patch('priority', v),
      patchProject: (v) => patch('project_id', v),
      patchLabels: (ids) => patch('label_ids', ids),
      patchDueDate: (v) => patch('due_date', v),
      enterEdit,
      cancel,
      commit,
    }),
    [
      mode,
      saving,
      dirty,
      title,
      body,
      status,
      priority,
      projectId,
      labelIds,
      labels,
      dueDate,
      patch,
      enterEdit,
      cancel,
      commit,
    ],
  )

  return (
    <IssueDraftContext.Provider value={value}>
      {children}
    </IssueDraftContext.Provider>
  )
}

function fieldEqualsRemote(
  key: keyof Draft,
  value: unknown,
  issue: IssueDetail,
): boolean {
  switch (key) {
    case 'title':
      return value === issue.title
    case 'body':
      return value === issue.body_full
    case 'status':
      return value === issue.status
    case 'priority':
      return value === issue.priority
    case 'project_id':
      return value === issue.project_id
    case 'due_date':
      return (value ?? null) === (issue.due_date ?? null)
    case 'label_ids':
      return sameLabelIds(
        value as string[],
        issue.labels.map((l) => l.id),
      )
    default:
      return false
  }
}
