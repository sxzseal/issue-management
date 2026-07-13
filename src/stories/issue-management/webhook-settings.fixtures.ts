/**
 * Story fixtures for issue-management / Webhook 设置
 *
 * 从 mocks 层的 fixtures 转发数据 + 定义 story 侧使用的 UI 文案。
 */

export type { WebhookLog } from '../../../mocks/fixtures/webhook-settings'
export {
  CURL_EXAMPLE,
  EMPTY_LOGS,
  NODE_EXAMPLE,
  PYTHON_EXAMPLE,
  SECRET_MASKED,
  WEBHOOK_ENDPOINT_URL,
  WEBHOOK_LOGS,
} from '../../../mocks/fixtures/webhook-settings'

/** UI 文案（v1 中文裸文本 OK） */
export const WEBHOOK_MESSAGES = {
  pageTitle: 'Webhook 入站',
  pageDescription:
    '让 Claude Code / CI 脚本 / 开发环境无摩擦推入 issue',
  viewDocs: '查看文档',
  viewDocsArrow: '查看文档 →',

  endpointTitle: 'Endpoint URL',
  endpointDescription: '外部服务向此地址 POST JSON 即可创建 issue',

  secretTitle: 'Shared Secret',
  secretDescription: '用于 HMAC-SHA256 签名请求 body',
  copy: '复制',
  rotate: '轮换 secret',
  copyConfirmTitle: '复制 secret 到剪贴板？',
  copyConfirmDescription:
    '该 secret 一旦离开本机即视为泄漏；请仅在安全环境粘贴。',
  copyConfirmAction: '确认复制',
  rotateConfirmTitle: '确定要轮换 secret？',
  rotateConfirmDescription:
    '轮换后旧 secret 立即失效，所有正在使用的集成需要更新配置。',
  rotateConfirmAction: '立即轮换',
  cancel: '取消',

  examplesTitle: '示例请求',
  examplesDescription:
    '所有请求必须带 X-Webhook-Signature / X-Webhook-Source / X-Webhook-Event-Id 三个 header',

  logsTitle: '最近入站',
  logsDescription: '最近 20 条 webhook 请求',
  logsEmpty: '暂无入站记录',
  logsEmptyHint: '外部 POST 一次即可在这里看到日志',
  logsLoading: '加载中…',

  colReceivedAt: '接收时间',
  colSource: '来源',
  colEventId: '事件 ID',
  colStatus: 'HTTP',
  colError: '错误摘要',
  colIssue: '关联 issue',
  none: '—',
} as const
