/**
 * UpdateSkillCard — 让已发放 token 的用户拿到最新的 SKILL.md 安装命令。
 *
 * 服务端只存 token 的哈希,无法反查明文,所以让用户把自己保存的 token 粘进来,
 * 在浏览器本地拼装安装命令。粘贴框是 password 类型,不会走网络,不写入任何状态外
 * 的地方。适合 SKILL.md 有新版能力(如批量创建)时,让老 token 用户无需换 secret
 * 就能覆盖本地文件。
 */
import { useMemo, useState } from 'react'
import {
  Check,
  ChevronRight,
  Copy,
  RefreshCw,
  Sparkles,
  Terminal,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import {
  buildInstallCommand,
  buildSkillFile,
  SKILL_INSTALL_PATH_DISPLAY,
} from '../ai-skill'

// Same literal as api/lib/api-token.ts TOKEN_PREFIX. Kept local to avoid a
// cross-boundary import (frontend can't reach api/).
const TOKEN_PREFIX = 'imt_live_'

function currentBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function UpdateSkillCard() {
  const [token, setToken] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const installCopy = useCopyToClipboard()
  const skillCopy = useCopyToClipboard()

  const baseUrl = currentBaseUrl()
  const trimmed = token.trim()
  const looksValid =
    trimmed.startsWith(TOKEN_PREFIX) && trimmed.length > TOKEN_PREFIX.length + 8

  const installCommand = useMemo(
    () => (looksValid ? buildInstallCommand(baseUrl, trimmed) : ''),
    [looksValid, baseUrl, trimmed],
  )
  const skillFile = useMemo(
    () => (looksValid ? buildSkillFile(baseUrl, trimmed) : ''),
    [looksValid, baseUrl, trimmed],
  )

  const showBadPrefix = trimmed.length > 0 && !trimmed.startsWith(TOKEN_PREFIX)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <RefreshCw className="h-4 w-4 text-primary" />
          重新生成 SKILL.md
        </CardTitle>
        <CardDescription>
          SKILL.md 更新了(例如新增批量创建能力)后,已安装 skill 的机器需要覆盖
          写入才能用上。服务端不保留 token 明文,请把你之前保存的 token
          粘到下方,命令在浏览器本地拼好,不会发送到服务器。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="regen-token-input">粘贴已有 Token</Label>
          <Input
            id="regen-token-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={`${TOKEN_PREFIX}…`}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            aria-invalid={showBadPrefix}
          />
          {showBadPrefix ? (
            <p className="text-xs text-destructive">
              Token 应以 <code className="font-mono">{TOKEN_PREFIX}</code> 开头
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              我们只用它在本地拼安装命令,不会发送到服务器
            </p>
          )}
        </div>

        {looksValid ? (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>覆盖已安装的 Skill</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">写入到</span>
              <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
                {SKILL_INSTALL_PATH_DISPLAY}
              </code>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>一键覆盖命令</span>
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
                >
                  {installCopy.copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {installCopy.copied ? '已复制' : '复制命令'}
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

            <div className="rounded-md border border-input bg-muted/40">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((v) => !v)}
                  aria-expanded={previewOpen}
                  className={cn(
                    'flex flex-1 items-center gap-1 text-left text-xs font-medium text-foreground',
                    'transition-colors hover:text-foreground/80',
                    'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform',
                      previewOpen && 'rotate-90',
                    )}
                  />
                  <span>
                    预览 <code className="font-mono">SKILL.md</code> 内容
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (skillFile)
                      void skillCopy.copy(skillFile, '已复制 SKILL.md')
                  }}
                  className={cn(
                    'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs',
                    'text-muted-foreground transition-colors hover:bg-muted',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  {skillCopy.copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {skillCopy.copied ? '已复制' : '复制文件'}
                </button>
              </div>
              {previewOpen ? (
                <pre
                  className={cn(
                    'max-h-64 overflow-y-auto border-t border-input px-3 py-3',
                    'whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground',
                  )}
                >
                  <code className="break-words">{skillFile}</code>
                </pre>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
