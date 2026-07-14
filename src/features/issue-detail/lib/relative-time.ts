/**
 * Human-readable "N 分钟前" for ISO timestamps. Buckets: 刚刚 / N 分钟前 /
 * N 小时前 / N 天前 (<7d) / YYYY-MM-DD.
 *
 * Shared by CommentItem and IssueDetailView; keep the thresholds in one place
 * so a wording tweak lands everywhere at once.
 */
export function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso.slice(0, 10)
  const diffSec = Math.max(0, Math.round((now - then) / 1000))
  if (diffSec < 60) return '刚刚'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return iso.slice(0, 10)
}
