/**
 * EndpointCard — 展示 Webhook 端点 URL + 复制按钮（AC-071）
 *
 * URL 取 `${window.location.origin}/api/webhooks/issues`；点击复制走 Clipboard API，
 * 成功后 toast 提示。SSR 环境下 `window` 不可用，这里 view 只跑在浏览器端，无需兜底。
 */
import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

export function EndpointCard() {
  const url = `${window.location.origin}/api/webhooks/issues`
  const { copied, copy } = useCopyToClipboard()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Endpoint URL</CardTitle>
        <CardDescription>外部服务向此地址 POST JSON 即可创建 issue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code
            className={cn(
              'min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2',
              'overflow-x-auto whitespace-nowrap font-mono text-xs text-muted-foreground'
            )}
          >
            {url}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copy(url, '已复制端点 URL')}
            className="gap-1.5"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
