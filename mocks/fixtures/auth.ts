/**
 * Auth 模拟数据（mocks 层通用 fixtures）
 *
 * 与 handlers/auth.ts 共享；story fixtures 会引用这里的 BRAND / 密码常量。
 */

export const BRAND = {
  productName: 'Issue 管理平台',
  tagline: '主密码登录',
  initial: 'I',
  footer: '忘记密码请去后台 reset',
} as const

export const DEFAULT_FORM = {
  password: '',
} as const

export const VALID_PASSWORD = 'correct-password'
export const FROZEN_PASSWORD = 'frozen-account'

/**
 * 用于演示"密码错误"故事的样例尝试记录（供 story mock 展示表单里的错误信息）
 */
export const FAILED_ATTEMPTS: ReadonlyArray<{
  password: string
  message: string
}> = [
  { password: '123456', message: '密码错误' },
  { password: 'password', message: '密码错误' },
  { password: 'admin', message: '密码错误' },
]

export const RATE_LIMITED_STATE = {
  frozenUntilLabel: '5:00',
  message: '尝试次数过多，账号已冻结 5 分钟',
} as const

export const SUCCESS_RESPONSE = {
  token: 'mock-jwt-xxx',
  expires_at: '2026-08-12T00:00:00Z',
} as const
