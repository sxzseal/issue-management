/**
 * Build the Claude Code Skill package for the just-created API token.
 *
 * A Claude Code skill is a directory under `~/.claude/skills/<name>/` with a
 * `SKILL.md` file. The frontmatter `description` is what Claude uses to decide
 * whether to auto-invoke the skill in future conversations — so the description
 * enumerates the exact keywords the user is likely to type ("create issue",
 * "改状态", etc.). The body is a prescriptive playbook the model reads on
 * invocation: resolve the current project from git/cwd, deduplicate against
 * open issues, then create or comment. This keeps the AI's behavior consistent
 * across sessions and prevents duplicate-issue noise.
 *
 * `buildSkillFile` returns the SKILL.md content.
 * `buildInstallCommand` returns a one-line shell command that installs it —
 * heredoc + `<<'IMEOF'` to prevent any `${}` / backtick expansion by the shell.
 */

const SKILL_NAME = 'issue-management'
const HEREDOC_SENTINEL = 'IMEOF'

export function buildSkillFile(baseUrl: string, token: string): string {
  return `---
name: ${SKILL_NAME}
description: Use whenever the user asks to log, track, create, list, update, comment on, or close an issue / task / bug / todo in their personal issue-management system at ${baseUrl}. Triggers on phrases like "记一下这个 bug", "加个 issue", "log this", "track this task", "创建 issue", "改状态", "评论", "list issues", "close this", or any CRUD request against issues/projects/comments/labels. On invocation, always follow the "Create-or-update issue playbook" below — resolve the current project from git/cwd first, dedupe against open issues, then create or comment. Contains base URL, bearer token, endpoint catalog, and JSON envelope contract; no extra setup.
---

# Issue Management API

REST API for the user's personal issue-management app. All requests use HTTPS
and return a JSON envelope. Call it directly with \`curl\` or \`fetch\` — no SDK
required.

## Auth

Every request must carry:

\`\`\`
Authorization: Bearer ${token}
\`\`\`

Base URL: \`${baseUrl}\`

Treat the token as a password. Never echo it in tool output or commit it.

## Response envelope

- Success: \`{ "status_code": 0, "data": T, "message"?: string }\`
- Failure: \`{ "status_code": <non-zero>, "data": null, "message": string }\`
  - \`40101\` unauthorized · \`40401\` not found · \`40901\` name conflict · \`42201\` validation failed

Always read \`message\` on 4xx/5xx before retrying.

## Constants

- \`status\`: \`todo\` | \`in_progress\` | \`done\` | \`archived\`
- \`priority\`: \`p0\` (紧急) | \`p1\` (高) | \`p2\` (中,默认) | \`p3\` (低)

---

## Create-or-update issue playbook (READ FIRST)

Follow these steps in order. Do NOT create an issue with a raw \`POST /api/issues\`
without running steps 1–3 first, or duplicates will pile up.

### Step 1 — Resolve the current project

Derive a canonical project name from the environment, in this priority:

1. \`git remote get-url origin\` — parse the last path segment, strip \`.git\`.
   Example: \`git@github.com:alice/omni-flow.git\` → \`omni-flow\`.
2. If no git remote: \`basename "$(pwd)"\` — the working-directory folder name.
3. If neither is available: prompt the user for a project name.

Then look it up:

\`\`\`
curl -s -H "Authorization: Bearer ${token}" ${baseUrl}/api/projects
\`\`\`

Case-insensitive match on \`name\`. If a match exists → use its \`id\`. If not,
auto-create:

\`\`\`
curl -s -X POST -H "Authorization: Bearer ${token}" \\
     -H "Content-Type: application/json" \\
     -d '{"name":"<derived-name>","color":"#6366f1"}' \\
     ${baseUrl}/api/projects
\`\`\`

Pick any hex color from: \`#6366f1 #10b981 #f59e0b #ef4444 #8b5cf6 #06b6d4 #ec4899\`
— rotate to avoid all-blue projects.

**Cache the resolved \`project_id\` for the rest of the session.** Do not re-run
this lookup for every subsequent issue in the same conversation.

### Step 2 — Deduplicate

Before creating, search the target project for an open issue that already covers
this. The \`q\` filter is title-prefix search only, so do not send a bag of
unrelated keywords. Use a short leading title phrase, URL-encoded. If that is
too narrow, list open issues for the project and compare titles locally:

\`\`\`
curl -s -H "Authorization: Bearer ${token}" \\
     "${baseUrl}/api/issues?project_id=<id>&status=todo&q=<encoded-leading-title-phrase>"
curl -s -H "Authorization: Bearer ${token}" \\
     "${baseUrl}/api/issues?project_id=<id>&status=in_progress&q=<encoded-leading-title-phrase>"
curl -s -H "Authorization: Bearer ${token}" \\
     "${baseUrl}/api/issues?project_id=<id>&status=todo,in_progress&page_size=100"
\`\`\`

An existing issue counts as a duplicate when **any** of these hold:

- Title matches case-insensitively after trimming punctuation.
- The intended source-context fingerprint (see Step 3) appears in an existing
  \`body_full\` — fetch \`GET /api/issues/:id\` to check when the title looks close.
- ≥60% of your title's non-stop-word tokens overlap with an existing title AND
  they refer to the same file/symbol.

If a duplicate is found:

- Instead of creating, \`POST /api/issues/:id/comments\` with the new context
  ("再次触发,加了栈信息:..." / "新增复现步骤:...").
- If the user's request implies status change (e.g. "已经修了"), also
  \`PATCH /api/issues/:id/status\`.
- Report the existing issue ID + URL back to the user; do NOT silently no-op.

### Step 3 — Create with source context

If no duplicate, \`POST /api/issues\`. Build the body like this:

\`\`\`
<user's description in natural language>

---
Source:
- repo: <owner/repo or folder name>
- commit: <short sha from \`git rev-parse --short HEAD\`, if in git>
- files: <relative paths of files the issue is about, one per line>
- fingerprint: <a short stable string — e.g. "auth/login.ts:42:duplicate-submit">
\`\`\`

The \`fingerprint\` line is what makes Step 2 reliable next time: keep it
deterministic (file:line:concept), not a random hash. Include it verbatim.

Defaults when the user didn't specify:

- \`priority\`: \`p2\`. Escalate to \`p1\` if the user said "紧急" / "urgent" / "阻塞".
  Use \`p0\` only for outage-class asks.
- \`status\`: omit (server defaults to \`todo\`).
- \`label_ids\`: omit unless the user named labels. If labels are named, resolve
  them with \`GET /api/labels\` (case-insensitive name match) and send their ids.

### Step 4 — Report back

Return the issue \`id\`, the title, and a clickable URL:
\`${baseUrl}/issues/<id>\` (or the project view if the user asked for a batch).
Never dump the raw envelope at the user.

---

## Other operations

### Status change

Prefer \`PATCH /api/issues/:id/status\` (dedicated endpoint) over the general
\`PATCH /api/issues/:id\` for status-only changes.

### Listing

When the user says "what am I working on" / "show me open issues", scope to the
current project (Step 1) and \`status=todo,in_progress\` — don't dump the whole
system. Sort by \`priority\` if the response supports it, otherwise present
p0/p1 first.

### Bulk creation

If the user asks to log multiple items in one turn: resolve the project ONCE,
then loop through Step 2 → Step 3 per item. Deduplicate each independently.

---

## Endpoints reference

### Projects
- \`GET  /api/projects\` — list all projects (Inbox included)
- \`POST /api/projects\` — \`{ name, color, sort_order? }\`
- \`PATCH /api/projects/:id\` — partial update
- \`DELETE /api/projects/:id?cascade=reject|reassign\`

### Issues
- \`GET  /api/issues?project_id=&status=&priority=&labels=&q=&page=&page_size=\` — paginated list
- \`POST /api/issues\` — \`{ project_id, title, body?, priority, status?, due_date?, label_ids? }\`
- \`GET  /api/issues/:id\` — detail (includes \`body_full\`, \`labels[]\`)
- \`PATCH /api/issues/:id\` — partial update (\`title\`/\`body\`/\`priority\`/\`label_ids\`/\`due_date\`/\`project_id\`)
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

---

## Worked example

User: "刚发现登录页表单能重复提交,记一下"

1. \`git remote get-url origin\` → \`omni-flow-web\` → \`GET /api/projects\` →
   found \`{ id: "proj_abc", name: "omni-flow-web" }\`. Cache it.
2. Title prefix: \`登录页表单\`. \`GET /api/issues?project_id=proj_abc&status=todo&q=%E7%99%BB%E5%BD%95%E9%A1%B5%E8%A1%A8%E5%8D%95\` → empty.
3. \`POST /api/issues\`:
   \`\`\`json
   {
     "project_id": "proj_abc",
     "title": "登录页表单可重复提交",
     "body": "登录页 submit 按钮点击后未 disable,慢网络下会触发多次请求。\\n\\n---\\nSource:\\n- repo: omni-flow-web\\n- commit: 93985e9\\n- files: src/features/auth/login.tsx\\n- fingerprint: features/auth/login.tsx:submit:duplicate",
     "priority": "p2"
   }
   \`\`\`
4. Reply: "已记录 → [登录页表单可重复提交](${baseUrl}/issues/iss_xxx)"

## Quick smoke test

\`\`\`
curl -H "Authorization: Bearer ${token}" ${baseUrl}/api/projects
\`\`\`
`
}

/**
 * One-liner the user can paste into a terminal. Installs the skill globally
 * into Claude Code's config directory — resolved at run time from
 * \`$CLAUDE_CONFIG_DIR\` (Claude Code's own override) and falling back to
 * \`$HOME/.claude\`, so the same command works on any machine regardless of
 * where the user keeps their Claude config. Heredoc uses a quoted sentinel
 * (\`<<'IMEOF'\`) so the shell performs zero expansion inside the file body.
 */
export function buildInstallCommand(baseUrl: string, token: string): string {
  const file = buildSkillFile(baseUrl, token)
  return `DIR="\${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/${SKILL_NAME}" && mkdir -p "$DIR" && cat > "$DIR/SKILL.md" <<'${HEREDOC_SENTINEL}'
${file}${HEREDOC_SENTINEL}`
}

/**
 * Human-readable path shown in the UI. Uses the shell expression rather than a
 * concrete path because the real location varies per-machine (via
 * \`$CLAUDE_CONFIG_DIR\`).
 */
export const SKILL_INSTALL_PATH_DISPLAY = `$CLAUDE_CONFIG_DIR/skills/${SKILL_NAME}/SKILL.md (默认 ~/.claude/skills/${SKILL_NAME}/SKILL.md)`
