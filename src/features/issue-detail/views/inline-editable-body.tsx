/**
 * InlineEditableBody — click-to-edit issue description (body_full).
 *
 * Read mode: renders <BodyMarkdown> + a hover-visible "编辑" button.
 * Edit mode: Edit / 预览 tabs, Cmd+Enter saves, Esc cancels.
 *
 * Extras vs. InlineEditableTitle:
 *   - <Textarea> instead of <Input>
 *   - Paperclip button opens file picker → upload → insert markdown at cursor
 *   - Paste / drag-drop images (or any file) into the textarea → upload +
 *     insert `![filename](url)` or `[filename](url)` for non-images.
 */
import { useRef, useState } from 'react'
import { Check, Paperclip, Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { BodyMarkdown } from './body-markdown'
import { useUploadAttachmentMutation } from '../mutations'
import { usePasteDropUpload } from '../lib/paste-drop-upload'

const TAB_EDIT = 'edit'
const TAB_PREVIEW = 'preview'
const MAX_LEN = 200_000

interface InlineEditableBodyProps {
  issueId: string
  value: string
  onSave: (body: string) => Promise<void> | void
  disabled?: boolean
}

export function InlineEditableBody({
  issueId,
  value,
  onSave,
  disabled,
}: InlineEditableBodyProps) {
  const [editing, setEditing] = useState<boolean>(false)
  const [draft, setDraft] = useState<string>(value)
  const [tab, setTab] = useState<string>(TAB_EDIT)
  const [saving, setSaving] = useState<boolean>(false)

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

  const enterEdit = () => {
    if (disabled) return
    setDraft(value)
    setTab(TAB_EDIT)
    setEditing(true)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const commit = async () => {
    if (upload.isPending) {
      // A placeholder token is still in `draft`; blocking here prevents
      // `![Uploading …]()` from being persisted as the issue body.
      return
    }
    if (draft === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } catch {
      // mutation surfaces its own toast; stay in edit mode so the user can retry
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="group relative">
        <BodyMarkdown>{value}</BodyMarkdown>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={enterEdit}
          aria-label="编辑描述"
          disabled={disabled}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
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
            disabled={saving || upload.isPending}
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
              // Allow the same file to be re-picked
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
                void commit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={onDragOver}
            placeholder="用 Markdown 描述问题…（Cmd/Ctrl + Enter 保存，Esc 取消。支持拖拽 / 粘贴图片）"
            rows={12}
            maxLength={MAX_LEN}
            className={cn('min-h-64 resize-y font-mono text-sm')}
            disabled={saving}
          />
        </TabsContent>
        <TabsContent value={TAB_PREVIEW} className="mt-2">
          <div className="min-h-64 rounded-md border border-border bg-card p-3">
            <BodyMarkdown hideEmptyPlaceholder>{draft}</BodyMarkdown>
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Cmd/Ctrl + Enter 保存 · Esc 取消
          {upload.isPending ? ' · 附件上传中…' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={cancel}
            disabled={saving}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={() => void commit()}
            disabled={saving || upload.isPending || draft === value}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            {saving ? '保存中…' : upload.isPending ? '上传中…' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
