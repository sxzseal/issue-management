/**
 * issue-detail 模拟数据（mocks 层通用 fixtures）
 *
 * 与 handlers/issue-detail.ts 共享；story fixtures 引用这里的 DETAIL_ISSUE / DETAIL_COMMENTS 等。
 *
 * 来源：.loop/prd.md §7 领域模型 + .loop/api-contracts.json
 * 覆盖 endpoints:
 *   GET    /api/issues/:id
 *   PATCH  /api/issues/:id
 *   PATCH  /api/issues/:id/status
 *   GET    /api/issues/:id/comments
 *   POST   /api/issues/:id/comments
 *   DELETE /api/comments/:id
 *   DELETE /api/issues/:id
 */

import type { Comment, Issue } from '../../src/stories/issue-management/_shared/domain'

/**
 * 用于 NotFound 故事的固定 id — handler 见到它会返回 404
 */
export const NOT_FOUND_ID = 'iss_notfound_404'

/**
 * 详情页展示的完整 issue（含 body_full 全文 markdown）
 *
 * body_r2_key 非空表示正文超过阈值被拆到 R2；handler 返回时会带 body_full 字段。
 */
export const DETAIL_ISSUE: Issue & { body_full: string } = {
  id: 'iss_forge_042',
  project_id: 'proj_forge',
  title: '[ai-forge] 调度器在多并发触发下丢失 issue 事件',
  body: '调度器在多并发触发下丢失 issue 事件的复现与初步分析。',
  body_r2_key: 'issues/iss_forge_042/body.md',
  status: 'in_progress',
  priority: 'p0',
  label_ids: ['lbl_bug', 'lbl_refactor', 'lbl_debt'],
  due_date: '2026-07-20',
  source: 'api',
  source_name: 'github:mlamp/ai-forge#pr-17',
  created_at: '2026-06-15T09:12:00Z',
  updated_at: '2026-07-13T09:45:00Z',
  body_full: `## 背景

我们的调度器 \`scheduler.tick()\` 在同一个 D1 事务内串行处理 webhook 事件。
最近 \`ai-forge\` 上线后，触发频率从每小时 10 次涨到 200 次左右。
线上监控显示：**约 3% 的 webhook 事件没有落库**，且没有任何错误日志。

## 复现步骤

1. 用 \`k6 run bench/webhook.js --vus 20 --duration 30s\` 模拟并发写入。
2. 观察 \`SELECT COUNT(*) FROM issues WHERE source='webhook' AND created_at > $ts\`。
3. 计数 ≈ 请求数 × 0.97，其余静默失败。

## 初步分析

- Cloudflare D1 单库串行化，本身不会丢数据。
- 抓包发现：**部分请求在 Worker 层就被限流**（\`err.name === 'D1_QUEUE_FULL'\`）。
- 但我们的 catch 语句只判断了 \`err.code === 40901\`，忽略了 D1 的自定义错误名。

\`\`\`ts
// worker/scheduler.ts (excerpt)
try {
  await env.DB.batch(stmts)
} catch (err) {
  // BUG: 只关注 status_code，没检查 err.name
  if ((err as ApiError).code === 40901) {
    await enqueueRetry(payload)
  }
  // 其他错误直接 rethrow → 但 D1_QUEUE_FULL 被 wrangler runtime 吞掉，日志无痕
}
\`\`\`

## 修复方案

> 优先级 P0，需要在本周合并到 main 分支。

1. **短期**：把 \`err.name === 'D1_QUEUE_FULL'\` 也纳入重试路径。
2. **中期**：给 D1 batch 加 client-side semaphore，避免超出 25 并发。
3. **长期**：把 webhook 写入改为 Queues consumer，与 web 手动创建解耦。

## 影响面

| 项目 | 每日事件 | 预估丢失 |
|------|---------:|--------:|
| ai-forge | 4800 | ~144 |
| personal-site | 1200 | ~36 |
| obsidian-plugin | 300 | ~9 |

## 附录

- 详见 PR #17 的 draft 分支 \`fix/scheduler-d1-queue-full\`。
- Slack 讨论：#ai-forge-ops 6/12 12:30 起。
- 相关 issue：#38（webhook 重放不幂等）、#41（scheduler tick 超时）。
`,
}

/**
 * 6 条评论 — 按 created_at DESC 倒序返回（最新在前）
 *
 * 覆盖：
 *  - 短评（多条）
 *  - 一条极长评论（作为超长边界测试）
 *  - 中文 + 代码引用
 */
export const DETAIL_COMMENTS: Comment[] = [
  {
    id: 'cmt_006',
    issue_id: DETAIL_ISSUE.id,
    body:
      '刚才 review 了下 PR #17，`err.name === "D1_QUEUE_FULL"` 的判断建议提到工具函数里，其他 handler 也可能踩坑。@nixi 帮忙看下 `worker/queue.ts` 里同类逻辑，一并抽了。',
    created_at: '2026-07-13T09:44:00Z',
  },
  {
    id: 'cmt_005',
    issue_id: DETAIL_ISSUE.id,
    body: '已在 PR #17 修复，加了 D1_QUEUE_FULL 分支 + 单测。跑了 30s @ 20 VUs，丢失率归 0，请审。',
    created_at: '2026-07-12T22:11:00Z',
  },
  {
    id: 'cmt_004',
    issue_id: DETAIL_ISSUE.id,
    body:
      '整理下当前进度：\n\n1. 短期方案：catch D1_QUEUE_FULL — 今天下班前 PR。\n2. 中期方案：semaphore — 本周内。\n3. 长期方案：Queues consumer — 下 sprint 单开 issue。\n\n有反对意见现在提。',
    created_at: '2026-07-11T15:03:00Z',
  },
  {
    id: 'cmt_003',
    issue_id: DETAIL_ISSUE.id,
    body:
      '这个问题我之前在 obsidian-plugin 那边也见过一次，当时怀疑是幂等，没深追。看来是同一个根因。\n\n补充一个复现现象：**只有当 D1 batch 里 statement 数 > 8 时才会触发**，单 statement 的 upsert 从来没丢过。可能与 D1 内部 queue 长度上限有关。',
    created_at: '2026-07-10T11:27:00Z',
  },
  {
    id: 'cmt_002',
    issue_id: DETAIL_ISSUE.id,
    body:
      '初步排查发现是 D1 索引缺失导致某些查询走了全表扫描，占满了 D1 的并发额度。补上 `CREATE INDEX idx_issues_source_created ON issues(source, created_at DESC)` 后并发从 15 涨到 22，但丢事件的问题没变，说明真正的瓶颈不在读侧。',
    created_at: '2026-06-25T08:52:00Z',
  },
  {
    id: 'cmt_001',
    issue_id: DETAIL_ISSUE.id,
    body:
      '这条 issue 是 6/15 从 webhook 自动创建的，触发链是 ai-forge 里 `.loop/dev-loop` 完成一次 tick 后向本系统推送状态。当时刚好上线两周，webhook 频率翻了 20 倍，值得深挖到底。\n\n先按老规矩，把复现步骤 + 现象日志贴一起，再决定要不要拉个短会。',
    created_at: '2026-06-16T14:08:00Z',
  },
]

/**
 * 活动日志 —— v1 仅记 status / priority / label / project 变更（不含评论、编辑正文等）
 * 按时间正序展示（旧 → 新）
 */
export type ActivityKind = 'status' | 'priority' | 'label' | 'project'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  from: string
  to: string
  at: string
}

export const ACTIVITY_LOG: ActivityEntry[] = [
  {
    id: 'act_001',
    kind: 'project',
    from: 'Inbox',
    to: 'ai-forge',
    at: '2026-06-16T14:15:00Z',
  },
  {
    id: 'act_002',
    kind: 'priority',
    from: 'P1 高',
    to: 'P0 紧急',
    at: '2026-06-25T09:00:00Z',
  },
  {
    id: 'act_003',
    kind: 'label',
    from: 'bug',
    to: 'bug, refactor, tech-debt',
    at: '2026-07-10T11:30:00Z',
  },
  {
    id: 'act_004',
    kind: 'status',
    from: '待办',
    to: '进行中',
    at: '2026-07-11T15:05:00Z',
  },
]
