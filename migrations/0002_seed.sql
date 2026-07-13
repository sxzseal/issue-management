-- issue-management v1 · seed data
-- Stable literal IDs so tests can assert. Uses INSERT OR IGNORE for idempotency.
-- All timestamps are ISO 8601 UTC (2026-07-13T...Z).

BEGIN;

------------------------------------------------------------------------------
-- projects (5)
------------------------------------------------------------------------------
INSERT OR IGNORE INTO projects (id, name, color, is_inbox, sort_order, created_at, updated_at) VALUES
  ('proj_inbox',     'Inbox',      '#64748b', 1, 0, '2026-07-13T00:00:00Z', '2026-07-13T00:00:00Z'),
  ('proj_forge',     'AI Forge',   '#3b82f6', 0, 1, '2026-07-13T00:00:01Z', '2026-07-13T00:00:01Z'),
  ('proj_paperbird', 'PaperBird',  '#10b981', 0, 2, '2026-07-13T00:00:02Z', '2026-07-13T00:00:02Z'),
  ('proj_bufflab',   'BuffLab',    '#f59e0b', 0, 3, '2026-07-13T00:00:03Z', '2026-07-13T00:00:03Z'),
  ('proj_infra',     '基础设施',   '#8b5cf6', 0, 4, '2026-07-13T00:00:04Z', '2026-07-13T00:00:04Z');

------------------------------------------------------------------------------
-- labels (6)
------------------------------------------------------------------------------
INSERT OR IGNORE INTO labels (id, name, color, created_at, updated_at) VALUES
  ('lbl_bug',     'bug',     '#ef4444', '2026-07-13T00:01:00Z', '2026-07-13T00:01:00Z'),
  ('lbl_feature', 'feature', '#3b82f6', '2026-07-13T00:01:01Z', '2026-07-13T00:01:01Z'),
  ('lbl_docs',    'docs',    '#10b981', '2026-07-13T00:01:02Z', '2026-07-13T00:01:02Z'),
  ('lbl_chore',   'chore',   '#64748b', '2026-07-13T00:01:03Z', '2026-07-13T00:01:03Z'),
  ('lbl_perf',    'perf',    '#f59e0b', '2026-07-13T00:01:04Z', '2026-07-13T00:01:04Z'),
  ('lbl_a11y',    'a11y',    '#8b5cf6', '2026-07-13T00:01:05Z', '2026-07-13T00:01:05Z');

------------------------------------------------------------------------------
-- issues (6) — mix of statuses/priorities/sources
--   iss_005 uses R2 overflow (body IS NULL, body_r2_key populated)
------------------------------------------------------------------------------
INSERT OR IGNORE INTO issues (
  id, project_id, title, body, body_r2_key, status, priority,
  due_date, external_ref, source, source_name,
  created_at, updated_at, archived_at
) VALUES
  ('iss_001', 'proj_forge',     '登录页在 Safari 上偶发白屏',
   '重现步骤：Safari 17 打开 /login → 点击 SSO 按钮 → 白屏。控制台报 CSP 违规。',
   NULL, 'todo', 'p0',
   '2026-07-15', NULL, 'manual', NULL,
   '2026-07-13T02:10:00Z', '2026-07-13T02:10:00Z', NULL),

  ('iss_002', 'proj_paperbird', '新增导出 PDF 的批量任务队列',
   '需要将现有的单次导出封装为队列任务，支持进度回调和失败重试。',
   NULL, 'in_progress', 'p1',
   '2026-07-20', NULL, 'manual', NULL,
   '2026-07-13T03:00:00Z', '2026-07-13T04:15:00Z', NULL),

  ('iss_003', 'proj_bufflab',   'API 文档 openapi.json 缺少 rate limit 字段',
   '在 /docs 页面的 429 响应示例里补上 X-RateLimit-* header 说明。',
   NULL, 'done', 'p2',
   NULL, NULL, 'manual', NULL,
   '2026-07-12T09:00:00Z', '2026-07-13T05:30:00Z', NULL),

  ('iss_004', 'proj_infra',     '归档旧的 CI 工作流文件',
   '.github/workflows 目录里 legacy-* 前缀的四个 yaml 已废弃，可以删除。',
   NULL, 'archived', 'p3',
   NULL, NULL, 'manual', NULL,
   '2026-07-01T08:00:00Z', '2026-07-10T12:00:00Z', '2026-07-10T12:00:00Z'),

  ('iss_005', 'proj_inbox',     '[Linear] 用户反馈：仪表盘筛选器展开后无法关闭',
   NULL,
   'issues/iss_005/body', 'todo', 'p1',
   NULL, 'linear-evt-abc123', 'webhook', 'linear',
   '2026-07-13T06:45:00Z', '2026-07-13T06:45:00Z', NULL),

  ('iss_006', 'proj_forge',     '[GitHub] Dependabot: bump vite from 6.0.3 to 6.0.7',
   'Automatically opened by Dependabot. Patch release contains security fixes.',
   NULL, 'in_progress', 'p0',
   NULL, 'github-evt-def456', 'webhook', 'github',
   '2026-07-13T07:20:00Z', '2026-07-13T07:22:00Z', NULL);

------------------------------------------------------------------------------
-- issue_labels (8 rows; iss_004 has zero labels)
------------------------------------------------------------------------------
INSERT OR IGNORE INTO issue_labels (issue_id, label_id) VALUES
  ('iss_001', 'lbl_bug'),
  ('iss_001', 'lbl_perf'),
  ('iss_002', 'lbl_feature'),
  ('iss_003', 'lbl_docs'),
  ('iss_003', 'lbl_a11y'),
  ('iss_005', 'lbl_bug'),
  ('iss_006', 'lbl_feature'),
  ('iss_006', 'lbl_chore');

------------------------------------------------------------------------------
-- comments (5 rows across iss_001 and iss_003)
------------------------------------------------------------------------------
INSERT OR IGNORE INTO comments (id, issue_id, body, created_at) VALUES
  ('cmt_001', 'iss_001', '本地也复现了，看起来和 next-themes 的 SSR flash-of-unstyled 处理有关。', '2026-07-13T02:20:00Z'),
  ('cmt_002', 'iss_001', '我先在 CSP 里放行 script-src blob:，观察一下。',                             '2026-07-13T02:35:00Z'),
  ('cmt_003', 'iss_001', '不是 CSP，是 Safari 对 preconnect 的 bug；准备提交 workaround PR。',        '2026-07-13T02:55:00Z'),
  ('cmt_004', 'iss_003', 'openapi.json 已经补上，麻烦复核一下 429 example。',                          '2026-07-13T05:20:00Z'),
  ('cmt_005', 'iss_003', 'LGTM，合并。',                                                                '2026-07-13T05:29:00Z');

------------------------------------------------------------------------------
-- webhook_logs (4: 1 success, 1 HMAC failure, 1 rate limit, 1 validation)
------------------------------------------------------------------------------
INSERT OR IGNORE INTO webhook_logs (
  id, source, event_id, event_type, payload, http_status, error_summary, issue_id, received_at
) VALUES
  ('whlg_001', 'github', 'github-evt-def456', 'issues.opened',
   '{"action":"opened","issue":{"number":42,"title":"Dependabot: bump vite from 6.0.3 to 6.0.7"}}',
   200, NULL, 'iss_006', '2026-07-13T07:20:00Z'),

  ('whlg_002', 'github', 'github-evt-badsig-001', 'issues.opened',
   '{"action":"opened","issue":{"number":43}}',
   403, 'HMAC signature mismatch', NULL, '2026-07-13T07:25:00Z'),

  ('whlg_003', 'linear', 'linear-evt-ratelimit-001', 'Issue.create',
   '{"data":{"id":"lin_xyz","title":"quota exceeded"}}',
   429, 'rate limit: 60 req/min exceeded for source=linear', NULL, '2026-07-13T07:30:00Z'),

  ('whlg_004', 'linear', 'linear-evt-invalid-001', 'Issue.create',
   '{"data":{"title":""}}',
   422, 'validation failed: title must be 1..200 chars', NULL, '2026-07-13T07:35:00Z');

COMMIT;
