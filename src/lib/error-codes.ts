/**
 * Shared business error codes (Cloudflare Worker + frontend).
 *
 * status_code = 0 → success; any of the below → business error.
 * Codes group by HTTP class: 4xxxx = client, 5xxxx = server.
 */
export const ErrorCodes = {
  MISSING_FIELD: 40001,            // 缺参 / 请求体字段缺失
  UNAUTHORIZED: 40101,             // 未认证 / token 无效 / 密码错误
  FORBIDDEN: 40301,                // 无权限（一般不用于个人产品）
  NOT_FOUND: 40401,                // 资源不存在
  NAME_CONFLICT: 40901,            // 唯一约束（重名 / external_ref 冲突）
  CONSTRAINT_CONFLICT: 40902,      // 关联删除阻塞（项目下有 issue）
  VALIDATION_FAILED: 42201,        // Zod / 枚举 / 长度 / 日期 / page_size 越界
  RATE_LIMITED: 42901,             // 冻结 / 限流
  INTERNAL_ERROR: 50001,           // 兜底
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/** Human-readable Chinese default messages — routes can override per-case. */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.MISSING_FIELD]: '缺少必要字段',
  [ErrorCodes.UNAUTHORIZED]: '未授权',
  [ErrorCodes.FORBIDDEN]: '无权限',
  [ErrorCodes.NOT_FOUND]: '资源不存在',
  [ErrorCodes.NAME_CONFLICT]: '名称已存在',
  [ErrorCodes.CONSTRAINT_CONFLICT]: '存在关联数据，无法删除',
  [ErrorCodes.VALIDATION_FAILED]: '参数校验失败',
  [ErrorCodes.RATE_LIMITED]: '请求过于频繁',
  [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
}
