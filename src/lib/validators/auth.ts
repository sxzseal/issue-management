import { z } from 'zod'

export const loginBodySchema = z
  .object({
    password: z.string().min(1, '密码必填').max(128, '密码不能超过 128 字'),
  })
  .strict()

export type LoginBody = z.infer<typeof loginBodySchema>
