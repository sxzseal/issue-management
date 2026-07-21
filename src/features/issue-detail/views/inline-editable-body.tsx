/**
 * InlineEditableBody — issue description viewer + editor.
 *
 * view mode: renders <BodyMarkdown> from draft context.
 * edit mode: 编辑 / 预览 tabs, Paperclip file picker, paste/drop upload.
 *
 * Save/Cancel live on the page-level <EditModeActions> in the header — this
 * component only writes into the draft and never triggers a PATCH itself.
 * Attachment upload still happens immediately (multipart POST), and the
 * resulting markdown is inserted into the draft body; canceling the edit
 * later leaves those blobs as R2 garbage (see MANIFEST caveat).
 */
import { useRef } from 'react'
import { Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { BodyMarkdown } from './body-markdown'
import { useUploadAttachmentMutation } from '../mutations'
import { usePasteDropUpload } from '../lib/paste-drop-upload'
import { useIssueDraft } from '../lib/issue-draft'

const TAB_EDIT = 'edit'
const TAB_PREVIEW = 'preview'
const MAX_LEN = 200_000

interface InlineEditableBodyProps {
  issueId: string
}

export function InlineEditableBody({ issueId }: InlineEditableBodyProps) {
  const { mode, body, patchBody, saving } = useIssueDraft()

  if (mode === 'view') {
    return <BodyMarkdown>{body}</BodyMarkdown>
  }

  return (
    <BodyEditor
      issueId={issueId}
      value={body}
      onChange={patchBody}
      disabled={saving}
    />
  )
}

interface BodyEditorProps {
  issueId: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

function BodyEditor({ issueId, value, onChange, disabled }: BodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const upload = useUploadAttachmentMutation()
  const { onPaste, onDrop, onDragOver, handleFiles } = usePasteDropUpload({
    issueId,
    textareaRef,
    value,
    onChange,
    upload: upload.mutateAsync,
  })

  return (
    <div className="space-y-2">
      <Tabs defaultValue={TAB_EDIT}>
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
            disabled={disabled || upload.isPending}
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={onPaste}
            onDrop={onDrop}
            onDragOver={onDragOver}
            placeholder="用 Markdown 描述问题…（支持拖拽 / 粘贴图片）"
            rows={12}
            maxLength={MAX_LEN}
            className={cn('min-h-64 resize-y font-mono text-sm')}
            disabled={disabled}
          />
          {upload.isPending ? (
            <p className="mt-1 text-xs text-muted-foreground">附件上传中…</p>
          ) : null}
        </TabsContent>
        <TabsContent value={TAB_PREVIEW} className="mt-2">
          <div className="min-h-64 rounded-md border border-border bg-card p-3">
            <BodyMarkdown hideEmptyPlaceholder>{value}</BodyMarkdown>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
