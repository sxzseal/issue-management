import { http, HttpResponse, delay } from 'msw'

import { DETAIL_ISSUE, DETAIL_COMMENTS, NOT_FOUND_ID } from '../fixtures/issue-detail'

/**
 * issue-detail API mock handlers
 *
 * Endpoints:
 *  - GET    /api/issues/:id                 → Issue & { body_full }
 *  - PATCH  /api/issues/:id                 → Issue（部分字段更新）
 *  - PATCH  /api/issues/:id/status          → { id, status, updated_at }
 *  - GET    /api/issues/:id/comments        → Paginated<Comment>（DESC）
 *  - POST   /api/issues/:id/comments        → 201 Comment
 *  - DELETE /api/comments/:id               → 200 { data: null }
 *  - DELETE /api/issues/:id                 → 200 { data: null }
 *
 * Error codes:
 *  - 40401 issue 不存在或已被删除
 *  - 42201 评论内容不能为空
 */

interface PatchIssueBody {
  title?: string
  body?: string
  status?: string
  priority?: string
  label_ids?: string[]
  due_date?: string | null
  project_id?: string
}

interface PatchStatusBody {
  status?: string
}

interface PostCommentBody {
  body?: string
}

export const issueDetailHandlers = [
  http.get('/api/issues/:id', async ({ params }) => {
    await delay(300)
    if (params.id === NOT_FOUND_ID) {
      return HttpResponse.json(
        { status_code: 40401, message: '该 issue 不存在或已被删除', data: null },
        { status: 404 },
      )
    }
    return HttpResponse.json({
      status_code: 0,
      data: { ...DETAIL_ISSUE, id: params.id as string },
    })
  }),

  http.patch('/api/issues/:id', async ({ params, request }) => {
    await delay(250)
    const patch = (await request.json().catch(() => ({}))) as PatchIssueBody
    return HttpResponse.json({
      status_code: 0,
      data: {
        ...DETAIL_ISSUE,
        id: params.id as string,
        ...patch,
        updated_at: '2026-07-13T10:30:00Z',
      },
    })
  }),

  http.patch('/api/issues/:id/status', async ({ params, request }) => {
    await delay(200)
    const { status } = (await request.json().catch(() => ({}))) as PatchStatusBody
    return HttpResponse.json({
      status_code: 0,
      data: {
        id: params.id as string,
        status: status ?? DETAIL_ISSUE.status,
        updated_at: '2026-07-13T10:30:00Z',
      },
    })
  }),

  http.get('/api/issues/:id/comments', async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '1')
    const pageSize = Number(url.searchParams.get('page_size') ?? '30')
    return HttpResponse.json({
      status_code: 0,
      data: {
        list: DETAIL_COMMENTS,
        total: DETAIL_COMMENTS.length,
        page: Number.isFinite(page) && page > 0 ? page : 1,
        page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 30,
      },
    })
  }),

  http.post('/api/issues/:id/comments', async ({ params, request }) => {
    await delay(300)
    const body = (await request.json().catch(() => ({}))) as PostCommentBody
    const text = (body.body ?? '').trim()
    if (text.length === 0) {
      return HttpResponse.json(
        { status_code: 42201, message: '评论内容不能为空', data: null },
        { status: 422 },
      )
    }
    if (text.length > 10000) {
      return HttpResponse.json(
        { status_code: 42201, message: '评论内容不能超过 10000 字符', data: null },
        { status: 422 },
      )
    }
    return HttpResponse.json(
      {
        status_code: 0,
        data: {
          id: 'cmt_new_' + Math.random().toString(36).slice(2, 8),
          issue_id: params.id as string,
          body: text,
          created_at: '2026-07-13T10:30:00Z',
        },
      },
      { status: 201 },
    )
  }),

  http.delete('/api/comments/:id', async () => {
    await delay(200)
    return HttpResponse.json({ status_code: 0, data: null })
  }),

  http.delete('/api/issues/:id', async () => {
    await delay(200)
    return HttpResponse.json({ status_code: 0, data: null })
  }),
]
