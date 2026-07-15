import { z } from 'zod'

export const createApiTokenBodySchema = z
  .object({
    name: z.string().trim().min(1, '名称不能为空').max(60, '名称最长 60 字'),
  })
  .strict()

export type CreateApiTokenBody = z.infer<typeof createApiTokenBodySchema>
