/**
 * board feature · MSW handlers
 *
 * 覆盖三个 endpoint：
 *   - GET  /api/issues                 列表（支持 project_id / status 简单过滤）
 *   - PATCH /api/issues/:id/status     拖拽切列
 *   - POST /api/issues                 新建
 */

import { http, HttpResponse, delay } from 'msw'
import { BOARD_ISSUES } from '../fixtures/board'

export const boardHandlers = [
  http.get('/api/issues', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const status = url.searchParams.get('status')
    let list = BOARD_ISSUES
    if (projectId) list = list.filter((i) => i.project_id === projectId)
    if (status) list = list.filter((i) => i.status === status)
    return HttpResponse.json({
      status_code: 0,
      data: {
        list,
        total: list.length,
        page: 1,
        page_size: 100,
      },
    })
  }),

  http.patch('/api/issues/:id/status', async ({ params, request }) => {
    await delay(200)
    const body = (await request.json()) as { status?: string }
    if (!body.status) {
      return HttpResponse.json(
        { status_code: 40001, message: 'status 不能为空', data: null },
        { status: 400 },
      )
    }
    return HttpResponse.json({
      status_code: 0,
      data: {
        id: params.id as string,
        status: body.status,
        updated_at: '2026-07-13T10:30:00Z',
      },
    })
  }),

  http.post('/api/issues', async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as Record<string, unknown>
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      return HttpResponse.json(
        { status_code: 40001, message: 'title 不能为空', data: null },
        { status: 400 },
      )
    }
    return HttpResponse.json(
      {
        status_code: 0,
        data: {
          id: 'iss_new_' + Math.random().toString(36).slice(2, 8),
          project_id: body.project_id ?? 'proj_inbox',
          title: body.title,
          body: body.body ?? '',
          body_r2_key: null,
          status: body.status ?? 'todo',
          priority: body.priority ?? 'p2',
          label_ids: body.label_ids ?? [],
          due_date: body.due_date ?? null,
          source: 'web',
          webhook_ref: null,
          created_at: '2026-07-13T10:30:00Z',
          updated_at: '2026-07-13T10:30:00Z',
        },
      },
      { status: 201 },
    )
  }),

  http.get('/api/projects', async () => {
    await delay(100)
    const { MOCK_PROJECTS } = await import('@/stories/issue-management/_shared/domain')
    return HttpResponse.json({ status_code: 0, data: MOCK_PROJECTS })
  }),
]
