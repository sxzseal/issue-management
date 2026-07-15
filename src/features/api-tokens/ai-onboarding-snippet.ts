/**
 * Build the "AI onboarding" markdown snippet shown in the token-created modal.
 *
 * The output is designed to be pasted verbatim into a Claude Code `CLAUDE.md`,
 * a Cursor `.cursorrules`, or any AI tool's system-prompt / instruction slot.
 * It contains the base URL, the raw bearer token, the response envelope
 * contract, and a compact endpoint catalog covering the abilities the user
 * asked to expose (create / edit / status / comment / list / query).
 *
 * Kept as plain string concatenation — no template engine, no i18n; the
 * consumer of the snippet is an LLM which does not care about typography.
 */
export function buildAiOnboardingSnippet(
  baseUrl: string,
  token: string,
): string {
  return `# Issue Management API 使用说明

调用一个内部 issue 管理系统的 REST API。所有请求走 HTTPS、返回 JSON 信封。

## 认证
所有请求必须携带：
\`\`\`
Authorization: Bearer ${token}
\`\`\`

Base URL: \`${baseUrl}\`

## 响应信封
- 成功：\`{ "status_code": 0, "data": T, "message"?: string }\`
- 失败：\`{ "status_code": 非0, "data": null, "message": string }\`
  - 40101 未授权 · 40401 资源不存在 · 40901 名称冲突 · 42201 参数校验失败

## 常量
- \`status\`: \`todo\` | \`in_progress\` | \`done\` | \`archived\`
- \`priority\`: \`p0\` | \`p1\` | \`p2\` | \`p3\`

## 端点

### Projects
- \`GET  /api/projects\` — 列出全部项目（含 Inbox）
- \`POST /api/projects\` — \`{ name, color, sort_order? }\`
- \`PATCH /api/projects/:id\` — 部分更新
- \`DELETE /api/projects/:id?cascade=reject|reassign\`

### Issues
- \`GET  /api/issues?project_id=&status=&priority=&labels=&q=&page=&page_size=\` — 分页列表
- \`POST /api/issues\` — \`{ project_id, title, body?, priority, status?, due_date?, labels? }\`
- \`GET  /api/issues/:id\` — 详情（含 body_full、labels[]）
- \`PATCH /api/issues/:id\` — 部分更新（title/body/priority/labels/due_date/project_id）
- \`PATCH /api/issues/:id/status\` — \`{ status }\`
- \`DELETE /api/issues/:id\`

### Comments
- \`GET  /api/issues/:id/comments\`
- \`POST /api/issues/:id/comments\` — \`{ body }\`
- \`DELETE /api/comments/:id\`

### Labels
- \`GET  /api/labels\`
- \`POST /api/labels\` — \`{ name, color }\`
- \`PATCH /api/labels/:id\`
- \`DELETE /api/labels/:id\`

## 快速验证
\`\`\`
curl -H "Authorization: Bearer ${token}" ${baseUrl}/api/projects
\`\`\`

## 注意
- 不要把上面的 Token 写入代码仓库或分享给他人 —— 它等同于登录密码。
- 任何 4xx/5xx 响应都会带 \`message\` 说明原因，先读它再重试。
`
}
