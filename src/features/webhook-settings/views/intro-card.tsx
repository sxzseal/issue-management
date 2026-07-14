/**
 * IntroCard — /settings/webhook 页顶部信息卡（AC-071）
 *
 * 「查看示例」按钮滚动到本页的 ExamplesCard；不再外链占位文档。
 */
import { ArrowDown, Webhook } from 'lucide-react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const EXAMPLES_SECTION_ID = 'webhook-examples'

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
            <Webhook className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">Webhook 入站</CardTitle>
            <CardDescription className="mt-1">
              让 Claude Code / CI 脚本 / 开发环境无摩擦推入 issue
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
