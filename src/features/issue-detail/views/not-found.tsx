/**
 * NotFound — detail 404 empty state (AC-061 / AC-302).
 *
 * "该 issue 不存在或已被删除" + back-to-list button. Does NOT show a "无权限"
 * message — global auth is handled by request.ts + auth-guard, so at this
 * layer 404 is always "gone/never existed", never "you can't see this".
 */
import { Link } from 'react-router'
import { ArrowLeft, FileQuestion } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface NotFoundProps {
  issueId?: string
}

export function NotFound({ issueId }: NotFoundProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div
        aria-hidden
        className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground"
      >
        <FileQuestion className="h-6 w-6" />
      </div>
      <h2 className="mt-2 text-lg font-semibold">该 issue 不存在或已被删除</h2>
      <p className="text-sm text-muted-foreground">
        它可能已被硬删除，或链接错误
      </p>
      {issueId ? (
        <p className="font-mono text-xs text-muted-foreground">id: {issueId}</p>
      ) : null}
      <Button asChild className="mt-2 gap-1.5">
        <Link to="/list">
          <ArrowLeft className="h-3.5 w-3.5" />
          回列表
        </Link>
      </Button>
    </div>
  )
}
