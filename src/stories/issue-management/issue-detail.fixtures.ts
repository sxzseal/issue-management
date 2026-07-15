/**
 * Story fixtures for issue-management / 详情
 *
 * 单独抽出：编辑器 tab 常量、评论 placeholder、活动日志图标映射、附件占位文案。
 * 让 stories.tsx 只关心布局与交互。
 */

import { AlertOctagon, CircleDashed, FolderKanban, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  ACTIVITY_LOG,
  DETAIL_COMMENTS,
  DETAIL_ISSUE,
  NOT_FOUND_ID,
  type ActivityEntry,
  type ActivityKind,
} from '../../../mocks/fixtures/issue-detail'

export {
  ACTIVITY_LOG,
  DETAIL_COMMENTS,
  DETAIL_ISSUE,
  NOT_FOUND_ID,
  type ActivityEntry,
  type ActivityKind,
}

/** 评论输入框 placeholder */
export const COMMENT_PLACEHOLDER =
  '写下你的评论 · 支持 Markdown · Cmd/Ctrl + Enter 提交'

/** 编辑 / 预览 tab 常量 */
export const COMMENT_TABS = {
  edit: 'edit',
  preview: 'preview',
} as const

export const COMMENT_TAB_LABEL: Record<
  (typeof COMMENT_TABS)[keyof typeof COMMENT_TABS],
  string
> = {
  edit: '编辑',
  preview: '预览',
}

/** 活动日志图标映射 */
export const ACTIVITY_ICON: Record<ActivityKind, LucideIcon> = {
  status: CircleDashed,
  priority: AlertOctagon,
  label: Tag,
  project: FolderKanban,
}

export const ACTIVITY_VERB: Record<ActivityKind, string> = {
  status: '更新了状态',
  priority: '调整了优先级',
  label: '修改了标签',
  project: '移动了项目',
}

/** v1 附件占位 tooltip 文案 */
export const ATTACHMENT_STUB_TEXT = 'v1 暂不支持附件，即将上线'

/** 顶部 action bar 文案 */
export const DETAIL_ACTIONS = {
  copyLink: '复制链接',
  copyLinkDone: '已复制',
  archive: '归档',
  unarchive: '取消归档',
  delete: '删除',
  deleteConfirmTitle: '确认删除该 issue？',
  deleteConfirmBody:
    '删除后进入 5 秒 undo 窗口，超时后不可恢复。评论、活动日志将一并移除。',
  deleteConfirmCancel: '取消',
  deleteConfirmOk: '确认删除',
  saveTitle: '保存',
  cancelTitle: '取消',
  editTitleTooltip: '点击编辑标题',
  publish: '发布',
  publishing: '发布中…',
} as const

/** 右栏卡片标题 */
export const SIDE_LABELS = {
  status: '状态',
  priority: '优先级',
  project: '项目',
  labels: '标签',
  dueDate: '截止日期',
  activity: '活动日志',
  change: '更改',
  addLabel: '+ 添加',
  noDueDate: '未设置',
  attachmentTitle: '附件',
} as const

/** NotFound story 文案 */
export const NOT_FOUND_COPY = {
  title: '该 issue 不存在或已被删除',
  hint: '你可以返回列表继续处理其他 issue。',
  backToList: '返回列表',
} as const

/**
 * 简易 Markdown → HTML 渲染（原型阶段用，避免引入 marked / rehype）
 *
 * 覆盖：H2、H3、无序列表、有序列表、行内 code、代码块、引用块、粗体、表格（简化）、段落。
 * 不追求完备，只用来把 fixtures 里的中文 markdown 呈现得像样。
 */
export function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 拆代码块
  const parts: Array<{ type: 'code' | 'text'; value: string; lang?: string }> =
    []
  const fenceRe = /```(\w+)?\n([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = fenceRe.exec(md)) !== null) {
    if (m.index > last)
      parts.push({ type: 'text', value: md.slice(last, m.index) })
    parts.push({ type: 'code', value: m[2], lang: m[1] })
    last = m.index + m[0].length
  }
  if (last < md.length) parts.push({ type: 'text', value: md.slice(last) })

  return parts
    .map((part) => {
      if (part.type === 'code') {
        return `<pre class="rounded-md bg-muted p-3 text-sm overflow-x-auto"><code>${escape(part.value)}</code></pre>`
      }
      const lines = part.value.split('\n')
      const out: string[] = []
      let inUl = false
      let inOl = false
      let inTable = false
      const closeLists = () => {
        if (inUl) {
          out.push('</ul>')
          inUl = false
        }
        if (inOl) {
          out.push('</ol>')
          inOl = false
        }
      }
      const closeTable = () => {
        if (inTable) {
          out.push('</tbody></table>')
          inTable = false
        }
      }
      const inline = (s: string) => {
        let t = escape(s)
        t = t.replace(
          /`([^`]+)`/g,
          '<code class="rounded bg-muted px-1 py-0.5 text-[0.85em]">$1</code>',
        )
        t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        return t
      }

      for (const raw of lines) {
        const line = raw.trimEnd()
        if (line.startsWith('## ')) {
          closeLists()
          closeTable()
          out.push(`<h2>${inline(line.slice(3))}</h2>`)
          continue
        }
        if (line.startsWith('### ')) {
          closeLists()
          closeTable()
          out.push(`<h3>${inline(line.slice(4))}</h3>`)
          continue
        }
        if (line.startsWith('> ')) {
          closeLists()
          closeTable()
          out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`)
          continue
        }
        if (/^\d+\.\s/.test(line)) {
          closeTable()
          if (!inOl) {
            closeLists()
            out.push('<ol>')
            inOl = true
          }
          out.push(`<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`)
          continue
        }
        if (line.startsWith('- ')) {
          closeTable()
          if (!inUl) {
            closeLists()
            out.push('<ul>')
            inUl = true
          }
          out.push(`<li>${inline(line.slice(2))}</li>`)
          continue
        }
        if (line.startsWith('|') && line.endsWith('|')) {
          const cells = line
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim())
          // 分隔行 ( |---|---| )
          if (cells.every((c) => /^:?-+:?$/.test(c))) continue
          closeLists()
          if (!inTable) {
            out.push('<table><tbody>')
            inTable = true
          }
          out.push(
            '<tr>' +
              cells.map((c) => `<td>${inline(c)}</td>`).join('') +
              '</tr>',
          )
          continue
        }
        if (line === '') {
          closeLists()
          closeTable()
          continue
        }
        closeLists()
        closeTable()
        out.push(`<p>${inline(line)}</p>`)
      }
      closeLists()
      closeTable()
      return out.join('\n')
    })
    .join('\n')
}

/** 简单相对时间（原型内本地实现，避免拉 dayjs） */
export function relativeTime(
  iso: string,
  now: Date = new Date('2026-07-13T10:30:00Z'),
): string {
  const t = new Date(iso).getTime()
  const diff = now.getTime() - t
  const min = Math.round(diff / 60_000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} 天前`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo} 个月前`
  return `${Math.round(mo / 12)} 年前`
}

/** 展示用日期格式（YYYY-MM-DD） */
export function formatDate(iso: string): string {
  return iso.slice(0, 10)
}
