import { z } from 'zod'
import { issuePrioritySchema, issueStatusSchema } from './issue'

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期需为 YYYY-MM-DD')

export const webhookIngestBodySchema = z
  .object({
    event_type: z.enum(['issue.created', 'issue.updated', 'issue.closed']),
    external_ref: z.string().min(1).max(120),
    source_name: z.string().min(1).max(60),
    issue: z
      .object({
        title: z.string().min(1).max(200),
        body: z.string().max(200000).optional().nullable(),
        status: issueStatusSchema.optional(),
        priority: issuePrioritySchema.optional(),
        project_id: z.string().optional(), // optional → Inbox
        // label names (not ids); server upserts
        labels: z.array(z.string().min(1).max(30)).optional(),
        due_date: dateStringSchema.optional().nullable(),
        url: z.string().url().optional(),
      })
      .strict(),
  })
  .strict()

export const rotateSecretBodySchema = z.object({}).strict()

export const recentWebhooksQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  })
  .strict()

export type WebhookIngestBody = z.infer<typeof webhookIngestBodySchema>
export type RotateSecretBody = z.infer<typeof rotateSecretBodySchema>
export type RecentWebhooksQuery = z.infer<typeof recentWebhooksQuerySchema>
