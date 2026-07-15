/**
 * ExamplesCard — cURL 示例，向 AI/脚本用户展示如何用 Bearer Token 调 REST。
 * 覆盖用户明确列举的能力：查列表、创建、修改、评论、改状态。
 */
import { Copy } from 'lucide-react'

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
import { EXAMPLES_SECTION_ID } from './intro-card'

interface ExampleProps {
  title: string
  code: string
}

function Example({ title, code }: ExampleProps) {
  const { copy } = useCopyToClipboard()
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => void copy(code, '已复制示例')}
        >
          <Copy className="h-3 w-3" />
          复制
        </Button>
      </div>
      <pre
        className={cn(
          'overflow-x-auto rounded-md border border-input bg-muted px-3 py-2',
          'font-mono text-[11px] leading-relaxed text-muted-foreground'
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

const EXAMPLES: ExampleProps[] = [
  {
    title: '查询所有项目',
    code: `curl -H "Authorization: Bearer imt_live_YOUR_TOKEN" \\
     https://your-app.example.com/api/projects`,
  },
  {
    title: '创建 issue',
    code: `curl -X POST -H "Authorization: Bearer imt_live_YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{"project_id":"proj_inbox","title":"从 AI 提交","priority":"p2"}' \\
     https://your-app.example.com/api/issues`,
  },
  {
    title: '修改 issue',
    code: `curl -X PATCH -H "Authorization: Bearer imt_live_YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{"title":"新标题","priority":"p1"}' \\
     https://your-app.example.com/api/issues/iss_001`,
  },
  {
    title: '改状态',
    code: `curl -X PATCH -H "Authorization: Bearer imt_live_YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{"status":"in_progress"}' \\
     https://your-app.example.com/api/issues/iss_001/status`,
  },
  {
    title: '发评论',
    code: `curl -X POST -H "Authorization: Bearer imt_live_YOUR_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{"body":"已经在处理这个问题。"}' \\
     https://your-app.example.com/api/issues/iss_001/comments`,
  },
  {
    title: '按项目 / 状态筛选 issue',
    code: `curl -H "Authorization: Bearer imt_live_YOUR_TOKEN" \\
     "https://your-app.example.com/api/issues?project_id=proj_inbox&status=todo&page_size=50"`,
  },
]

export function ExamplesCard() {
  return (
    <Card id={EXAMPLES_SECTION_ID}>
      <CardHeader>
        <CardTitle className="text-base">调用示例</CardTitle>
        <CardDescription>
          把 <code className="font-mono text-xs">imt_live_YOUR_TOKEN</code> 替换为你生成的 Token；域名替换为你部署的 Worker 地址
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {EXAMPLES.map((ex) => (
          <Example key={ex.title} {...ex} />
        ))}
      </CardContent>
    </Card>
  )
}
