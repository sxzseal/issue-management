/**
 * CommentComposer — the sticky-but-not-sticky footer editor (AC-056 + v2 附件).
 *
 * - Tabs: 编辑 / 预览 (Markdown preview via BodyMarkdown)
 * - Cmd/Ctrl + Enter submits
 * - Empty body disables submit; submitting again is guarded by pending state
 * - Successful submit clears the draft; failure keeps input (mutation toasts)
 * - v2: paperclip 打开文件选择器；粘贴 / 拖拽文件到 textarea 自动上传并插入 markdown
 *
 * Draft state is local — losing it on unmount is acceptable for v1.
 */
import { useRef, useState } from 'react'
import { Paperclip, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { BodyMarkdown } from './body-markdown'
import { useUploadAttachmentMutation } from '../mutations'
import { usePasteDropUpload } from '../lib/paste-drop-upload'

const TAB_EDIT = 'edit'
const TAB_PREVIEW = 'preview'
const MAX_LEN = 10000

interface CommentComposerProps {
  issueId: string
  onSubmit: (body: string) => Promise<void>
  className?: string
}

export function CommentComposer({
  issueId,
  onSubmit,
  className,
}: CommentComposerProps) {
  const [tab, setTab] = useState<string>(TAB_EDIT)
  const [draft, setDraft] = useState<string>('')
  const [pending, setPending] = useState<boolean>(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const upload = useUploadAttachmentMutation()
  const { onPaste, onDrop, onDragOver, handleFiles } = usePasteDropUpload({
    issueId,
    textareaRef,
    value: draft,
    onChange: setDraft,
    upload: upload.mutateAsync,
  })

  const submit = async () => {
    if (pending || upload.isPending) return
    const trimmed = draft.trim()
    if (!trimmed) return
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            aria-label="上传附件"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending || upload.isPending}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,text/plain,application/zip,application/json"
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length > 0) {
                void handleFiles(files)
              }
              e.target.value = ''
            }}
          />
        </div>
        <TabsContent value={TAB_EDIT} className="mt-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                void submit()
              }
            }}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={onDragOver}
            placeholder="发表评论…（Cmd/Ctrl + Enter 发送；支持拖拽 / 粘贴图片）"
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
          {upload.isPending ? ' · 附件上传中…' : ''}
        </span>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1.5"
          disabled={!draft.trim() || pending || upload.isPending}
          onClick={() => void submit()}
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? '发布中…' : upload.isPending ? '上传中…' : '发布'}
        </Button>
      </div>
    </div>
  )
}
