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

## Cache keys
- `['issue-detail', id]`
- `['issue-detail', id, 'comments', { page, pageSize }]`

## AC coverage
- AC-053 (title inline edit — mutation supports single-field patch)
- AC-054 (body_full inline edit — v2, InlineEditableBody with Edit/Preview tabs)
- AC-056 (comment compose optimistic; input preserved via UI; v2 支持粘贴 / 拖拽 / paperclip 上传)
- AC-058 (attr inline edit optimistic + rollback)
- AC-059 (delete confirm — mutation exposed; dialog is UI concern)
- v2 附件: 拖拽 / 粘贴 / Paperclip 触发上传 → 单文件 ≤ 25 MB → 插入 markdown → 图片经 `<AuthedImg>` 渲染
- v2 级联: `DELETE /api/issues/:id` 自动 sweep R2 attachments 前缀 `issues/<id>/attachments/`
