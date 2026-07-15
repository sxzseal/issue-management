import { z } from 'zod'

export const createCommentBodySchema = z
  .object({
    body: z.string().min(1, '评论不能为空').max(10000, '评论不能超过 10000 字'),
  })
  .strict()

export const listCommentsQuerySchema = z
  .object({
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

export type CreateCommentBody = z.infer<typeof createCommentBodySchema>
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>
