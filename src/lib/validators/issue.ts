import { z } from 'zod'

export const issueStatusSchema = z.enum([
  'todo',
  'in_progress',
  'done',
  'archived',
])
export const issuePrioritySchema = z.enum(['p0', 'p1', 'p2', 'p3'])

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期需为 YYYY-MM-DD')

// -----------------------------------------------------------------------------
// Bulk mutation limits — kept low enough that a fan-out INSERT/UPDATE batch
// stays well under D1's per-batch statement cap. `BULK_LABELS_MAX` bounds the
// labels-per-op factor; combined with `BULK_ISSUES_MAX` the cartesian product
// for `/bulk/labels` in replace mode stays ≤ 1000 statements.
// -----------------------------------------------------------------------------
export const BULK_CREATE_MAX = 100
export const BULK_ISSUES_MAX = 100
export const BULK_LABELS_MAX = 10

const uniqueLabelIdsSchema = z.preprocess(
  (value) => (Array.isArray(value) ? Array.from(new Set(value)) : value),
  z
    .array(z.string().min(1))
    .max(BULK_LABELS_MAX, `一次最多 ${BULK_LABELS_MAX} 个标签`),
)

export const createIssueBodySchema = z
  .object({
    project_id: z.string().min(1, 'project_id 必填'),
    title: z.string().min(1, '标题必填').max(200, '标题不能超过 200 字'),
    body: z
      .string()
      .max(200000, 'body 不能超过 200000 字')
      .optional()
      .nullable(),
    status: issueStatusSchema.optional().default('todo'),
    priority: issuePrioritySchema.optional().default('p2'),
    label_ids: z.array(z.string()).optional().default([]),
    due_date: dateStringSchema.optional().nullable(),
  })
  .strict()

export const bulkCreateIssueBodySchema = z
  .object({
    project_id: z.string().min(1, 'project_id 必填'),
    titles: z
      .array(z.string().min(1, '标题必填').max(200, '标题不能超过 200 字'))
      .min(1, '至少一个标题')
      .max(BULK_CREATE_MAX, `一次最多 ${BULK_CREATE_MAX} 条`),
    status: issueStatusSchema.optional().default('todo'),
    priority: issuePrioritySchema.optional().default('p2'),
    label_ids: uniqueLabelIdsSchema.optional().default([]),
    due_date: dateStringSchema.optional().nullable(),
  })
  .strict()

// partial update — no defaults so `undefined` means "no change"
export const updateIssueBodySchema = z
  .object({
    project_id: z.string().min(1).optional(),
    title: z
      .string()
      .min(1, '标题必填')
      .max(200, '标题不能超过 200 字')
      .optional(),
    body: z
      .string()
      .max(200000, 'body 不能超过 200000 字')
      .optional()
      .nullable(),
    status: issueStatusSchema.optional(),
    priority: issuePrioritySchema.optional(),
    label_ids: z.array(z.string()).optional(),
    due_date: dateStringSchema.optional().nullable(),
  })
  .strict()

export const updateIssueStatusBodySchema = z
  .object({
    status: issueStatusSchema,
  })
  .strict()

/** Shared patch across N issues — at least one field must be provided. */
export const bulkUpdateIssueBodySchema = z
  .object({
    ids: z
      .array(z.string().min(1))
      .min(1, '至少一个 id')
      .max(BULK_ISSUES_MAX, `一次最多 ${BULK_ISSUES_MAX} 条`),
    patch: z
      .object({
        status: issueStatusSchema.optional(),
        priority: issuePrioritySchema.optional(),
        due_date: dateStringSchema.nullable().optional(),
        project_id: z.string().min(1).optional(),
      })
      .strict()
      .refine(
        (p) =>
          p.status !== undefined ||
          p.priority !== undefined ||
          p.due_date !== undefined ||
          p.project_id !== undefined,
        { message: 'patch 至少要包含一个字段' },
      ),
  })
  .strict()

export const bulkIssueLabelsModeSchema = z.enum(['add', 'remove', 'replace'])

export const bulkIssueLabelsBodySchema = z
  .object({
    ids: z
      .array(z.string().min(1))
      .min(1, '至少一个 id')
      .max(BULK_ISSUES_MAX, `一次最多 ${BULK_ISSUES_MAX} 条`),
    label_ids: uniqueLabelIdsSchema,
    mode: bulkIssueLabelsModeSchema,
  })
  .strict()
  .refine((data) => data.label_ids.length > 0, {
    // Empty label_ids is rejected in ALL modes — including `replace`. Otherwise
    // an accidentally-empty payload in replace mode silently wipes every label
    // on every listed issue. To clear labels, callers must be explicit: query
    // the current labels and send them via `mode: 'remove'`.
    message: '至少一个 label_id',
    path: ['label_ids'],
  })

export const bulkDeleteIssueBodySchema = z
  .object({
    ids: z
      .array(z.string().min(1))
      .min(1, '至少一个 id')
      .max(BULK_ISSUES_MAX, `一次最多 ${BULK_ISSUES_MAX} 条`),
  })
  .strict()

export const listIssuesQuerySchema = z
  .object({
    project_id: z.string().optional(),
    status: z.union([issueStatusSchema, z.array(issueStatusSchema)]).optional(),
    priority: z
      .union([issuePrioritySchema, z.array(issuePrioritySchema)])
      .optional(),
    labels: z.array(z.string()).optional(),
    due_from: dateStringSchema.optional(),
    due_to: dateStringSchema.optional(),
    q: z.string().max(200).optional(),
    sort: z
      .enum(['created_at', 'updated_at', 'due_date', 'priority'])
      .optional()
      .default('updated_at'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    page_size: z.coerce
      .number()
      .int()
      .min(1)
      .max(100, 'page_size 不能超过 100')
      .optional()
      .default(20),
  })
  .strict()

export type IssueStatus = z.infer<typeof issueStatusSchema>
export type IssuePriority = z.infer<typeof issuePrioritySchema>
export type CreateIssueBody = z.infer<typeof createIssueBodySchema>
export type BulkCreateIssueBody = z.infer<typeof bulkCreateIssueBodySchema>
export type UpdateIssueBody = z.infer<typeof updateIssueBodySchema>
export type UpdateIssueStatusBody = z.infer<typeof updateIssueStatusBodySchema>
export type BulkUpdateIssueBody = z.infer<typeof bulkUpdateIssueBodySchema>
export type BulkIssueLabelsBody = z.infer<typeof bulkIssueLabelsBodySchema>
export type BulkIssueLabelsMode = z.infer<typeof bulkIssueLabelsModeSchema>
export type BulkDeleteIssueBody = z.infer<typeof bulkDeleteIssueBodySchema>
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>
