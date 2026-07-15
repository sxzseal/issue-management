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
export type UpdateIssueBody = z.infer<typeof updateIssueBodySchema>
export type UpdateIssueStatusBody = z.infer<typeof updateIssueStatusBodySchema>
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>
