/**
 * Webhook 设置 mock fixtures（mocks 层通用 fixtures）
 *
 * 与 handlers/webhook-settings.ts 共享；story fixtures 会引用这里的类型与数据。
 */

export interface WebhookLog {
  id: string
  received_at: string
  source: string
  event_id: string
  http_status: number
  error_message: string | null
  issue_id: string | null
  issue_title: string | null
}

export const SECRET_MASKED = 'wh_secret_••••••••••••••3f2a'

export const WEBHOOK_ENDPOINT_URL =
  'https://issues-api.example.workers.dev/api/webhooks/issues'

/**
 * 20 条 webhook 入站日志：
 *  - 14 条成功（200/201）
 *  - 3 条 HMAC 签名失败（403）
 *  - 2 条限流（429）
 *  - 1 条 payload 校验失败（422）
 *
 * 时间分布在 2026-07-12 → 2026-07-13 的最近 24 小时窗口。
 */
export const WEBHOOK_LOGS: WebhookLog[] = [
  {
    id: 'wh_log_20260713_142811_01',
    received_at: '2026-07-13T14:28:11Z',
    source: 'claude-code',
    event_id: 'evt_2f8b91a0c4e14e6a',
    http_status: 201,
    error_message: null,
    issue_id: 'iss_9c7d21',
    issue_title: '登录页 rate-limit 文案缺少倒计时',
  },
  {
    id: 'wh_log_20260713_141902_02',
    received_at: '2026-07-13T14:19:02Z',
    source: 'ci',
    event_id: 'evt_a91c33dd08b74f01',
    http_status: 200,
    error_message: null,
    issue_id: 'iss_9c7d1f',
    issue_title: 'CI: flaky playwright test in auth.spec.ts',
  },
  {
    id: 'wh_log_20260713_140055_03',
    received_at: '2026-07-13T14:00:55Z',
    source: 'manual',
    event_id: 'evt_5b1d0af22c1e4a37',
    http_status: 403,
    error_message: 'invalid signature',
    issue_id: null,
    issue_title: null,
  },
  {
    id: 'wh_log_20260713_135430_04',
    received_at: '2026-07-13T13:54:30Z',
    source: 'github-action',
    event_id: 'evt_7d2f14a9b8c9401b',
    http_status: 201,
    error_message: null,
    issue_id: 'iss_9c7d1c',
    issue_title: 'GitHub Action: PR #142 needs review',
  },
  {
    id: 'wh_log_20260713_133215_05',
    received_at: '2026-07-13T13:32:15Z',
    source: 'obsidian-hook',
    event_id: 'evt_c19a2b7f1e8d4c02',
    http_status: 200,
    error_message: null,
    issue_id: 'iss_9c7d1a',
    issue_title: 'Obsidian: 每日报告未同步',
  },
  {
    id: 'wh_log_20260713_131847_06',
    received_at: '2026-07-13T13:18:47Z',
    source: 'ci',
    event_id: 'evt_88a4dd3120fe4b91',
    http_status: 429,
    error_message: 'rate limit: 30 req/min',
    issue_id: null,
    issue_title: null,
  },
  {
    id: 'wh_log_20260713_130202_07',
    received_at: '2026-07-13T13:02:02Z',
    source: 'claude-code',
    event_id: 'evt_43c1b5e9a0284da8',
    http_status: 201,
    error_message: null,
    issue_id: 'iss_9c7d17',
    issue_title: 'refactor: 抽出 useDebounce hook',
  },
  {
    id: 'wh_log_20260713_124811_08',
    received_at: '2026-07-13T12:48:11Z',
    source: 'manual',
    event_id: 'evt_9f81c72dbe5c4b12',
    http_status: 422,
    error_message: 'validation failed: title required',
    issue_id: null,
    issue_title: null,
  },
  {
    id: 'wh_log_20260713_122903_09',
    received_at: '2026-07-13T12:29:03Z',
    source: 'claude-code',
    event_id: 'evt_0af14b8c2d33488e',
    http_status: 201,
    error_message: null,
    issue_id: 'iss_9c7d13',
    issue_title: 'feat: webhook 入站日志分页',
  },
  {
    id: 'wh_log_20260713_121130_10',
    received_at: '2026-07-13T12:11:30Z',
    source: 'github-action',
    event_id: 'evt_ee2a138f7bd44f77',
    http_status: 200,
    error_message: null,
    issue_id: 'iss_9c7d11',
    issue_title: 'GitHub Action: 部署预览就绪',
  },
  {
    id: 'wh_log_20260713_115604_11',
    received_at: '2026-07-13T11:56:04Z',
    source: 'ci',
    event_id: 'evt_16b9a4d21c904e08',
    http_status: 200,
    error_message: null,
    issue_id: 'iss_9c7d10',
    issue_title: 'CI: build 通过',
  },
  {
    id: 'wh_log_20260713_113322_12',
    received_at: '2026-07-13T11:33:22Z',
    source: 'obsidian-hook',
    event_id: 'evt_71c4a19bff9c4d05',
    http_status: 403,
    error_message: 'invalid signature',
    issue_id: null,
    issue_title: null,
  },
  {
    id: 'wh_log_20260713_110948_13',
    received_at: '2026-07-13T11:09:48Z',
    source: 'claude-code',
    event_id: 'evt_2b7d381490c04a11',
    http_status: 201,
    error_message: null,
    issue_id: 'iss_9c7d0c',
    issue_title: 'feat: dashboard 空态优化',
  },
  {
    id: 'wh_log_20260713_104201_14',
    received_at: '2026-07-13T10:42:01Z',
    source: 'ci',
    event_id: 'evt_3f0aa5c2b9124a3d',
    http_status: 429,
    error_message: 'rate limit: 30 req/min',
    issue_id: null,
    issue_title: null,
  },
  {
    id: 'wh_log_20260713_102515_15',
    received_at: '2026-07-13T10:25:15Z',
    source: 'manual',
    event_id: 'evt_45e91cbb7cf94b6f',
    http_status: 200,
    error_message: null,
    issue_id: 'iss_9c7d08',
    issue_title: '手动补录：客户反馈 dashboard 加载慢',
  },
  {
    id: 'wh_log_20260713_094033_16',
    received_at: '2026-07-13T09:40:33Z',
    source: 'claude-code',
    event_id: 'evt_5d1b2ea987a34c12',
    http_status: 201,
    error_message: null,
    issue_id: 'iss_9c7d06',
    issue_title: 'fix: dark mode 下 badge 对比度不足',
  },
  {
    id: 'wh_log_20260713_091810_17',
    received_at: '2026-07-13T09:18:10Z',
    source: 'github-action',
    event_id: 'evt_a012b8f31dee4a3b',
    http_status: 200,
    error_message: null,
    issue_id: 'iss_9c7d04',
    issue_title: 'GitHub Action: PR #140 已合并',
  },
  {
    id: 'wh_log_20260713_083922_18',
    received_at: '2026-07-13T08:39:22Z',
    source: 'obsidian-hook',
    event_id: 'evt_c81dfa402be04b18',
    http_status: 403,
    error_message: 'invalid signature',
    issue_id: null,
    issue_title: null,
  },
  {
    id: 'wh_log_20260713_071144_19',
    received_at: '2026-07-13T07:11:44Z',
    source: 'ci',
    event_id: 'evt_e8123fbe4c0a4d92',
    http_status: 200,
    error_message: null,
    issue_id: 'iss_9c7d01',
    issue_title: 'CI: nightly regression 通过',
  },
  {
    id: 'wh_log_20260712_231208_20',
    received_at: '2026-07-12T23:12:08Z',
    source: 'claude-code',
    event_id: 'evt_6a1de29b4fbc4e73',
    http_status: 201,
    error_message: null,
    issue_id: 'iss_9c7cfe',
    issue_title: 'feat: 添加 webhook 设置页原型',
  },
]

export const EMPTY_LOGS: WebhookLog[] = []

export const CURL_EXAMPLE = `curl -X POST '${WEBHOOK_ENDPOINT_URL}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Webhook-Source: claude-code' \\
  -H 'X-Webhook-Event-Id: evt_1a2b3c4d5e6f7g8h' \\
  -H 'X-Webhook-Signature: sha256=<hmac-sha256 of body with shared secret>' \\
  -d '{
    "title": "登录页 rate-limit 文案缺少倒计时",
    "body": "在冻结状态下应显示剩余时间",
    "project_id": "proj_inbox",
    "labels": ["bug", "ui"]
  }'`

export const NODE_EXAMPLE = `import crypto from 'node:crypto'

const secret = process.env.WEBHOOK_SECRET!
const url = '${WEBHOOK_ENDPOINT_URL}'

const payload = {
  title: '登录页 rate-limit 文案缺少倒计时',
  body: '在冻结状态下应显示剩余时间',
  project_id: 'proj_inbox',
  labels: ['bug', 'ui'],
}

const body = JSON.stringify(payload)
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Source': 'claude-code',
    'X-Webhook-Event-Id': crypto.randomUUID(),
    'X-Webhook-Signature': \`sha256=\${signature}\`,
  },
  body,
})
console.log(res.status, await res.json())`

export const PYTHON_EXAMPLE = `import hmac
import hashlib
import json
import os
import uuid
import requests

secret = os.environ["WEBHOOK_SECRET"].encode()
url = "${WEBHOOK_ENDPOINT_URL}"

payload = {
    "title": "登录页 rate-limit 文案缺少倒计时",
    "body": "在冻结状态下应显示剩余时间",
    "project_id": "proj_inbox",
    "labels": ["bug", "ui"],
}
body = json.dumps(payload).encode()
signature = hmac.new(secret, body, hashlib.sha256).hexdigest()

resp = requests.post(
    url,
    data=body,
    headers={
        "Content-Type": "application/json",
        "X-Webhook-Source": "claude-code",
        "X-Webhook-Event-Id": str(uuid.uuid4()),
        "X-Webhook-Signature": f"sha256={signature}",
    },
)
print(resp.status_code, resp.json())`
