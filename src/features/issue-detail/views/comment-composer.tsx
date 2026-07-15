/**
 * CommentComposer — the sticky-but-not-sticky footer editor (AC-056).
 *
 * - Tabs: 编辑 / 预览 (Markdown preview via BodyMarkdown)
 * - Cmd/Ctrl + Enter submits
 * - Empty body disables submit; submitting again is guarded by pending state
 * - Successful submit clears the draft; failure keeps input (mutation toasts)
 *
 * Draft state is local — losing it on unmount is acceptable for v1.
 */
import { useState } from 'react'
import { Paperclip, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { BodyMarkdown } from './body-markdown'

const TAB_EDIT = 'edit'
const TAB_PREVIEW = 'preview'
const MAX_LEN = 10000

interface CommentComposerProps {
  issueId: string
  onSubmit: (body: string) => Promise<void>
  className?: string
}

export function CommentComposer({ onSubmit, className }: CommentComposerProps) {
  const [tab, setTab] = useState<string>(TAB_EDIT)
  const [draft, setDraft] = useState<string>('')
  const [pending, setPending] = useState<boolean>(false)

  const submit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || pending) return
    setPending(true)
    try {
      await onSubmit(trimmed)
      setDraft('')
      setTab(TAB_EDIT)
    } catch {
      // mutation surfaces its own toast; keep draft so the user can retry
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className={cn(
        'flex-none border-t border-border bg-background p-4',
        className,
      )}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-2">
          <TabsList className="h-8">
            <TabsTrigger value={TAB_EDIT} className="h-6 px-3 text-xs">
              编辑
            </TabsTrigger>
            <TabsTrigger value={TAB_PREVIEW} className="h-6 px-3 text-xs">
              预览
            </TabsTrigger>
          </TabsList>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                aria-label="附件"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">v1 暂不支持附件</TooltipContent>
          </Tooltip>
        </div>
        <TabsContent value={TAB_EDIT} className="mt-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                void submit()
              }
            }}
            placeholder="发表评论…（Cmd/Ctrl + Enter 发送）"
            rows={4}
            maxLength={MAX_LEN}
            className="min-h-24 resize-none"
            disabled={pending}
          />
        </TabsContent>
        <TabsContent value={TAB_PREVIEW} className="mt-2">
          <div className="min-h-24 rounded-md border border-border bg-card p-3">
            <BodyMarkdown hideEmptyPlaceholder>{draft}</BodyMarkdown>
          </div>
        </TabsContent>
      </Tabs>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Cmd/Ctrl + Enter 提交 · 支持 Markdown
        </span>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5"
          disabled={!draft.trim() || pending}
          onClick={() => void submit()}
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? '发布中…' : '发布'}
        </Button>
      </div>
    </div>
  )
}
