import { z } from 'zod'

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'color 必须是 #RRGGBB')

export const createProjectBodySchema = z
  .object({
    name: z.string().min(1, '项目名称必填').max(50, '项目名称不能超过 50 字'),
    color: hexColor,
    sort_order: z.number().int().min(0).optional(),
  })
  .strict()

export const updateProjectBodySchema = createProjectBodySchema.partial().strict()

export const deleteProjectQuerySchema = z
  .object({
    cascade: z.enum(['reject', 'reassign']).optional().default('reject'),
  })
  .strict()

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>
export type DeleteProjectQuery = z.infer<typeof deleteProjectQuerySchema>
