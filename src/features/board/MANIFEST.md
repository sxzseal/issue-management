# features/board

**Purpose**: kanban view data layer — group issues into 4 status columns, optimistic status swap, optimistic create.

## Public surface
- `boardQueries.overview({ project_id? })` — `queryOptions` returning `BoardData`
- `useUpdateIssueStatusMutation()` — PATCH `/api/issues/:id/status`, optimistic + rollback on error
- `useCreateIssueMutation()` — POST `/api/issues`, optimistic insert into target column
- `BOARD_COLUMNS`, `BOARD_COLUMN_LABELS`, types `BoardData` / `BoardColumn` / `BoardParams`

## Cache keys
- `['board', 'overview', { project_id }]`
- `['issue-list']` — invalidated after mutations so list view sees changes

## AC coverage
- AC-014 (optimistic insert on create)
- AC-015 (rollback + toast on failure)
- AC-024 (optimistic status swap + rollback + aria-live via UI layer)
