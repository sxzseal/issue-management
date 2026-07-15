/**
 * 表单错误文案提取器 — 从 TanStack Form 的 field.state.meta 抽出首条错误。
 *
 * 只在 touched 后展示，避免初始渲染就报错。
 * 不强依赖 TanStack Form，签名用 duck typing 保持零耦合。
 */
export interface FieldMetaLike {
  isTouched?: boolean
  errors?: ReadonlyArray<unknown>
}

export function formErrorText(
  meta: FieldMetaLike | undefined | null,
): string | null {
  if (!meta?.isTouched) return null
  const first = meta.errors?.[0]
  if (!first) return null
  if (typeof first === 'string') return first
  if (typeof first === 'object' && first !== null && 'message' in first) {
    const msg = (first as { message?: unknown }).message
    return typeof msg === 'string' ? msg : null
  }
  return null
}
