import { http, HttpResponse, delay } from 'msw'

/**
 * Auth API mock handlers
 *
 * Endpoints:
 *  - POST /api/auth/login   { password } → { token, expires_at }
 *  - POST /api/auth/logout  → { data: null }
 *
 * Error codes:
 *  - 40001 缺参
 *  - 40101 密码错误 / token 无效
 *  - 42901 冻结中
 */

interface LoginBody {
  password?: string
}

export const VALID_PASSWORD = 'correct-password'
export const FROZEN_PASSWORD = 'frozen-account'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(400)
    const body = (await request.json().catch(() => ({}))) as LoginBody

    if (!body.password) {
      return HttpResponse.json(
        { status_code: 40001, message: '密码不能为空', data: null },
        { status: 400 },
      )
    }

    if (body.password === FROZEN_PASSWORD) {
      return HttpResponse.json(
        {
          status_code: 42901,
          message: '账号已被冻结，请稍后再试',
          data: null,
        },
        { status: 429 },
      )
    }

    if (body.password === VALID_PASSWORD) {
      return HttpResponse.json({
        status_code: 0,
        data: {
          token: 'mock-jwt-xxx',
          expires_at: '2026-08-12T00:00:00Z',
        },
      })
    }

    return HttpResponse.json(
      { status_code: 40101, message: '密码错误', data: null },
      { status: 401 },
    )
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await delay(200)
    const auth = request.headers.get('authorization')
    if (auth && auth === 'Bearer invalid') {
      return HttpResponse.json(
        { status_code: 40101, message: 'token 无效', data: null },
        { status: 401 },
      )
    }
    return HttpResponse.json({ status_code: 0, data: null })
  }),
]
