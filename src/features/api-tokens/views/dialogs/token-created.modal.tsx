/**
 * TokenCreatedModal — one-shot dialog shown after a token is minted.
 *
 * Presents the raw token and a Claude Code Skill package: a one-line shell
 * command that writes a ready-to-use `SKILL.md` into `~/.claude/skills/` so any
 * future Claude Code session auto-loads it whenever the user asks to create /
 * change / list issues, projects, comments, or labels. No CLAUDE.md editing
 * required — the skill's frontmatter description is what triggers loading.
 */
import { useMemo } from 'react'
import { Check, Copy, Sparkles, Terminal } from 'lucide-react'

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
import {
  buildInstallCommand,
  buildSkillFile,
  SKILL_INSTALL_PATH_DISPLAY,
} from '../../ai-skill'

interface TokenCreatedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string | null
  name: string | null
}

/**
 * Base URL for the skill. Uses the browser's current origin — that's the exact
 * host the just-created token can actually reach (dev proxy, preview deploy,
 * or production URL). No config required.
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
  const installCopy = useCopyToClipboard()
  const skillCopy = useCopyToClipboard()

  const baseUrl = currentBaseUrl()

  const installCommand = useMemo(() => {
    if (!token) return ''
    return buildInstallCommand(baseUrl, token)
  }, [token, baseUrl])

  const skillFile = useMemo(() => {
    if (!token) return ''
    return buildSkillFile(baseUrl, token)
  }, [token, baseUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Token 已生成 · {name}</DialogTitle>
          <DialogDescription>
            <span className="text-destructive">
              此 Token 只显示一次,请立即保存。关闭后无法再次查看。
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

        {/* Section 2 — Claude Code Skill */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>安装为 Claude Code Skill</span>
          </div>
          <p className="text-xs text-muted-foreground">
            把下面这条命令粘贴到终端执行,Claude Code
            会在你之后要求"创建/查询/评论/改状态"issue 时自动加载,无需再编辑{' '}
            <code className="font-mono">CLAUDE.md</code> 或每次贴 Token。
          </p>

          {/* Install path notice — path resolves at run time from $CLAUDE_CONFIG_DIR */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">安装到</span>
            <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
              {SKILL_INSTALL_PATH_DISPLAY}
            </code>
          </div>

          {/* Install command */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Terminal className="h-3.5 w-3.5" />
                <span>一键安装命令</span>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() =>
                  installCommand &&
                  void installCopy.copy(installCommand, '已复制安装命令')
                }
                className="gap-1.5"
                disabled={!installCommand}
              >
                {installCopy.copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {installCopy.copied ? '已复制' : '复制安装命令'}
              </Button>
            </div>
            <pre
              className={cn(
                'max-h-32 overflow-y-auto rounded-md border border-input bg-muted p-3',
                'whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground',
              )}
            >
              <code className="break-all">{installCommand}</code>
            </pre>
          </div>

          {/* SKILL.md preview */}
          <details className="group rounded-md border border-input bg-muted/40">
            <summary
              className={cn(
                'flex cursor-pointer items-center justify-between gap-2 px-3 py-2',
                'text-xs font-medium text-foreground',
              )}
            >
              <span>
                预览 <code className="font-mono">SKILL.md</code> 内容
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (skillFile)
                    void skillCopy.copy(skillFile, '已复制 SKILL.md')
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  e.stopPropagation()
                  if (skillFile)
                    void skillCopy.copy(skillFile, '已复制 SKILL.md')
                }}
                aria-disabled={!skillFile}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs',
                  'text-muted-foreground transition-colors hover:bg-muted',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !skillFile && 'pointer-events-none opacity-50',
                )}
              >
                {skillCopy.copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {skillCopy.copied ? '已复制' : '复制文件'}
              </span>
            </summary>
            <pre
              className={cn(
                'max-h-64 overflow-y-auto border-t border-input px-3 py-3',
                'whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground',
              )}
            >
              <code className="break-words">{skillFile}</code>
            </pre>
          </details>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>已保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
