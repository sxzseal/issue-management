/**
 * IntroCard — /settings/api-tokens 顶部信息卡
 *
 * 说明 API Token 的用途,滚动到本页 ExamplesCard 查看 cURL。
 */
import { ArrowDown, KeyRound } from 'lucide-react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const EXAMPLES_SECTION_ID = 'api-tokens-examples'

function scrollToExamples() {
  const el = document.getElementById(EXAMPLES_SECTION_ID)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

export function IntroCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">API Token</CardTitle>
            <CardDescription className="mt-1">
              让 Claude Code / 脚本 / AI Agent 以 Bearer Token 调用完整 REST API
              —— 创建、修改、评论、改状态、查询皆可
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={scrollToExamples}
            className="inline-flex shrink-0 items-center gap-1 rounded text-sm text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            查看示例
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>
    </Card>
  )
}
