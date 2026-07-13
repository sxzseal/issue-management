import { z } from 'zod'

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'color 必须是 #RRGGBB')

export const createLabelBodySchema = z
  .object({
    name: z.string().min(1, '标签名称必填').max(30, '标签名称不能超过 30 字'),
    color: hexColor,
  })
  .strict()

export const updateLabelBodySchema = createLabelBodySchema.partial().strict()

export type CreateLabelBody = z.infer<typeof createLabelBodySchema>
export type UpdateLabelBody = z.infer<typeof updateLabelBodySchema>
