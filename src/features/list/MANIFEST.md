# features/list

**Purpose**: /list route data layer — filters, sort, pagination, URL sync.

## Public surface
- `useListParams()` — reads/writes URL search params; returns `[params, actions]`
- `listQueries.page(params)` — `queryOptions` for `Paginated<Issue>`
- `useDeleteIssueMutation()` — DELETE `/api/issues/:id` (row action)

## AC coverage
- AC-031 (filter chips), AC-032 (tri-state sort), AC-035 (page size 20/50/100), AC-038 (URL sync: refresh + copy-link reproduces state)

## Cache keys
- `['issue-list', params]` — one entry per unique filter combination
