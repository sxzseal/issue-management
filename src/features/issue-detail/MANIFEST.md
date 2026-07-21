# features/issue-detail

**Purpose**: /issue/:id data layer — read detail (with body_full merged), read comments, mutate any field including body_full, add/delete comments, delete issue, upload/delete attachments.

## Public surface
- `issueDetailQueries.byId(id)` — `IssueDetail` (includes `body_full`)
- `issueDetailQueries.comments(id, page?, pageSize?)` — `Paginated<Comment>`
- `useUpdateIssueMutation()` — optimistic partial PATCH; invalidates detail + board + list
- `useDeleteIssueMutation()` — DELETE issue; removes detail cache; invalidates list + board
- `useCreateCommentMutation()` — optimistic append (temp id); rollback on error
- `useDeleteCommentMutation()` — DELETE comment; invalidate comments list
- `useUploadAttachmentMutation()` — POST multipart to `/api/issues/:id/attachments`; returns `Attachment`
- `useDeleteAttachmentMutation()` — DELETE `/api/attachments/:id`
- `usePasteDropUpload({ issueId, textareaRef, value, onChange, upload })` — hook that returns `{ onPaste, onDrop, onDragOver, handleFiles }` handlers; inserts placeholder token at cursor, swaps to `![filename](url)` (image) or `[filename](url)` (file) on success
- `<AuthedImg src alt>` — bearer-authed `<img>` via blob URL; used inside `<BodyMarkdown>`'s `components.img` for `/api/attachments/*` URLs
- `<IssueDraftProvider issue>` + `useIssueDraft()` — page-level draft container; holds `{mode, dirty, saving, title, body, status, priority, projectId, labels, labelIds, dueDate}` + per-field `patchX` writers + `enterEdit / cancel / commit`. Wraps the whole detail view; all editable widgets are dumb-terminals over this context.
- `<EditModeActions />` — 编辑 / 取消 / 保存 button trio; wired into `BreadcrumbActions`. Nav-guarded via `useBlocker` + `beforeunload` inside the provider.

## Interaction model (v2)
- View mode: read-only. Right-header shows `复制链接 · 归档 · 删除 · 编辑`.
- Edit mode: all fields become editable. Header switches to `复制链接 · 取消 · 保存` — archive/delete are hidden while a draft is open. Save fires one coalesced PATCH via `useUpdateIssueMutation`. Cancel with a dirty draft opens a confirm dialog.
- Comments stay auto-save (independent of the issue draft).
- **Caveat**: attachments uploaded in edit mode are POSTed immediately to `/api/issues/:id/attachments`. Canceling the edit leaves those blobs in R2 as orphans — swept when the parent issue is deleted, otherwise garbage. Session-level upload tracking is deferred.

## Cache keys
- `['issue-detail', id]`
- `['issue-detail', id, 'comments', { page, pageSize }]`

## AC coverage
- AC-053 (title inline edit — mutation supports single-field patch; v2 通过 draft 汇总提交)
- AC-054 (body_full inline edit — v2, InlineEditableBody with Edit/Preview tabs; 保存并入 draft commit)
- AC-056 (comment compose optimistic; input preserved via UI; v2 支持粘贴 / 拖拽 / paperclip 上传;评论正文通过 `<BodyMarkdown>` 渲染,附件图片走 `<AuthedImg>`)
- AC-058 (attr edit — v2 由 `<IssueDraftProvider>` 汇总到一次 PATCH,不再逐字段 auto-save)
- AC-059 (delete confirm — mutation exposed; dialog is UI concern;edit 模式下删除按钮暂时隐藏)
- v2 附件: 拖拽 / 粘贴 / Paperclip 触发上传 → 单文件 ≤ 25 MB → 插入 markdown → 图片经 `<AuthedImg>` 渲染
- v2 级联: `DELETE /api/issues/:id` 自动 sweep R2 attachments 前缀 `issues/<id>/attachments/`
