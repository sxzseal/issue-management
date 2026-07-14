/**
 * ExamplesCard — curl / Node / Python 三个 Tabs 示例（AC-074）
 *
 * 每段代码含 X-Webhook-Signature / X-Webhook-Source / X-Webhook-Event-Id 三个 header
 * + body 示例。每个 tab 附一个「复制代码」按钮。
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { EXAMPLES_SECTION_ID } from './intro-card'

const CURL_EXAMPLE = `curl -X POST https://your-domain/api/webhooks/issues \\
  -H "X-Webhook-Signature: sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -r | cut -d' ' -f1)" \\
  -H "X-Webhook-Source: mysystem" \\
  -H "X-Webhook-Event-Id: $(uuidgen)" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"新任务","priority":"p2","external_ref":"ext-001"}'`

const NODE_EXAMPLE = `import crypto from 'node:crypto'

const SECRET = process.env.WEBHOOK_SECRET
const body = JSON.stringify({ title: '新任务', priority: 'p2', external_ref: 'ext-001' })
const signature = crypto.createHmac('sha256', SECRET).update(body).digest('hex')

await fetch('https://your-domain/api/webhooks/issues', {
  method: 'POST',
  headers: {
    'X-Webhook-Signature': \`sha256=\${signature}\`,
    'X-Webhook-Source': 'mysystem',
    'X-Webhook-Event-Id': crypto.randomUUID(),
    'Content-Type': 'application/json',
  },
  body,
})`

const PYTHON_EXAMPLE = `import hmac, hashlib, json, uuid, os, requests

SECRET = os.environ['WEBHOOK_SECRET']
body = json.dumps({'title': '新任务', 'priority': 'p2', 'external_ref': 'ext-001'})
signature = hmac.new(SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()

requests.post('https://your-domain/api/webhooks/issues',
  data=body,
  headers={
    'X-Webhook-Signature': f'sha256={signature}',
    'X-Webhook-Source': 'mysystem',
    'X-Webhook-Event-Id': str(uuid.uuid4()),
    'Content-Type': 'application/json',
  })`

type TabValue = 'curl' | 'node' | 'python'

const TABS: { value: TabValue; label: string; code: string }[] = [
  { value: 'curl', label: 'curl', code: CURL_EXAMPLE },
  { value: 'node', label: 'Node.js', code: NODE_EXAMPLE },
  { value: 'python', label: 'Python', code: PYTHON_EXAMPLE },
]

interface CodeBlockProps {
  code: string
}

function CodeBlock({ code }: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute right-2 top-2 gap-1.5"
        onClick={() => void copy(code, '已复制代码')}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? '已复制' : '复制'}
      </Button>
      <pre
        className={cn(
          'overflow-x-auto rounded-md bg-muted p-4 pr-24 text-xs',
          'font-mono text-foreground'
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function ExamplesCard() {
  return (
    <Card id={EXAMPLES_SECTION_ID} className="scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-base">示例请求</CardTitle>
        <CardDescription>
          所有请求必须带 X-Webhook-Signature / X-Webhook-Source / X-Webhook-Event-Id 三个 header
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="curl">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <CodeBlock code={tab.code} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
