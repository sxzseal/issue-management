/**
 * TokenCreatedModal — 新 token 一次性展示对话框
 *
 * 明文只显示一次。除了 raw token
 * 本身，还提供一段"AI 接入说明"—— base URL + token 已嵌入，粘贴到 Claude
 * Code / Cursor / 其他 AI 工具的系统提示里即可让 AI 直接调用。
 */
import { useMemo } from 'react'
import { Check, Copy, Sparkles } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { buildAiOnboardingSnippet } from '../../ai-onboarding-snippet'

interface TokenCreatedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string | null
  name: string | null
}

/**
 * Base URL for the AI snippet. Uses the browser's current origin — that's the
 * exact host the just-created token can actually reach (dev proxy, preview
 * deploy, or production URL). No config required.
 */
function currentBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function TokenCreatedModal({
  open,
  onOpenChange,
  token,
  name,
}: TokenCreatedModalProps) {
  const tokenCopy = useCopyToClipboard()
  const snippetCopy = useCopyToClipboard()

  const snippet = useMemo(() => {
    if (!token) return ''
    return buildAiOnboardingSnippet(currentBaseUrl(), token)
  }, [token])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Token 已生成 · {name}</DialogTitle>
          <DialogDescription>
            <span className="text-destructive">
              此 Token 只显示一次，请立即保存。关闭后无法再次查看。
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Section 1 — raw token */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">Token</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code
              className={cn(
                'min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2',
                'overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground',
              )}
            >
              {token ?? ''}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                token && void tokenCopy.copy(token, '已复制 Token')
              }
              className="gap-1.5"
              disabled={!token}
            >
              {tokenCopy.copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {tokenCopy.copied ? '已复制' : '复制'}
            </Button>
          </div>
        </div>

        {/* Section 2 — AI onboarding snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>AI 接入说明</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                snippet && void snippetCopy.copy(snippet, '已复制 AI 接入说明')
              }
              className="gap-1.5"
              disabled={!snippet}
            >
              {snippetCopy.copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {snippetCopy.copied ? '已复制' : '一键复制'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            贴到 Claude Code 的 <code className="font-mono">CLAUDE.md</code>
            、Cursor 的 <code className="font-mono">.cursorrules</code> 或任何
            AI 工具的系统提示里， AI 就能直接调用你的 issue-management API ——
            增删改查、评论、改状态皆可。
          </p>
          <pre
            className={cn(
              'max-h-64 overflow-y-auto rounded-md border border-input bg-muted p-3',
              'whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground',
            )}
          >
            <code className="break-words">{snippet}</code>
          </pre>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>已保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
