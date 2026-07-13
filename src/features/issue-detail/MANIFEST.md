# features/issue-detail

**Purpose**: /issue/:id data layer — read detail (with body_full merged), read comments, mutate any field, add/delete comments, delete issue.

## Public surface
- `issueDetailQueries.byId(id)` — `IssueDetail` (includes `body_full`)
- `issueDetailQueries.comments(id, page?, pageSize?)` — `Paginated<Comment>`
- `useUpdateIssueMutation()` — optimistic partial PATCH; invalidates detail + board + list
- `useDeleteIssueMutation()` — DELETE issue; removes detail cache; invalidates list + board
- `useCreateCommentMutation()` — optimistic append (temp id); rollback on error
- `useDeleteCommentMutation()` — DELETE comment; invalidate comments list

## Cache keys
- `['issue-detail', id]`
- `['issue-detail', id, 'comments', { page, pageSize }]`

## AC coverage
- AC-053 (title inline edit — mutation supports single-field patch)
- AC-056 (comment compose optimistic; input preserved via UI)
- AC-058 (attr inline edit optimistic + rollback)
- AC-059 (delete confirm — mutation exposed; dialog is UI concern)
