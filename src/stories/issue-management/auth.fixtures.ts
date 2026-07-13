/**
 * Story fixtures for issue-management / 登录
 *
 * 单独抽出 zod schema、初始表单值、状态相关文案，便于 stories.tsx 保持整洁。
 */
import { z } from 'zod'

import {
  BRAND,
  DEFAULT_FORM,
  FROZEN_PASSWORD,
  RATE_LIMITED_STATE,
  VALID_PASSWORD,
} from '../../../mocks/fixtures/auth'

export { BRAND, DEFAULT_FORM, FROZEN_PASSWORD, RATE_LIMITED_STATE, VALID_PASSWORD }

export const loginSchema = z.object({
  password: z
    .string({ required_error: '密码不能为空' })
    .min(6, '密码至少 6 位'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const defaultLoginValues: LoginFormValues = {
  password: DEFAULT_FORM.password,
}

/** 已知的错误提示文案（story 场景使用） */
export const LOGIN_MESSAGES = {
  submit: '登录',
  submitting: '登录中…',
  passwordLabel: '主密码',
  passwordPlaceholder: '请输入主密码',
  showPassword: '显示密码',
  hidePassword: '隐藏密码',
  wrongPassword: '密码错误',
  frozen: RATE_LIMITED_STATE.message,
  countdown: (label: string) => `剩余 ${label} 后可再次尝试`,
} as const
