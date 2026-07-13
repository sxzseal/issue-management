/**
 * IntroCard — /settings/webhook 页顶部信息卡（AC-071）
 *
 * 静态卡片：简介 + 文档链接（v1 占位 `#docs`）。
 */
import { ExternalLink, Webhook } from 'lucide-react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
          <a
            href="#docs"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
          >
            查看文档
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardHeader>
    </Card>
  )
}
