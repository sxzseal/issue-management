/**
 * MSW handlers barrel — 主 skill 独占写入（Step 2.5.3 gather 阶段）
 *
 * 每个 feature 的 handlers 在自己的 <feature>.ts 里，barrel 只做合并。
 * subagent 不可修改本文件。dev 阶段替换真实 API 时同步移除此层。
 */

import type { HttpHandler } from 'msw'
import { authHandlers } from './auth'
import { boardHandlers } from './board'
import { listHandlers } from './list'
import { issueDetailHandlers } from './issue-detail'

export const handlers: HttpHandler[] = [
  ...authHandlers,
  ...boardHandlers,
  ...listHandlers,
  ...issueDetailHandlers,
]
