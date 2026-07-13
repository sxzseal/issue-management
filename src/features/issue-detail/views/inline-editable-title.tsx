/**
 * InlineEditableTitle — H1 that flips to an Input on click (AC-053).
 *
 * State machine: `editing=false` → click H1 or edit icon → `editing=true` →
 * Enter saves, Escape cancels, or Save/Cancel buttons commit.
 *
 * Focus / autofocus handled by the Input's `autoFocus` prop when we mount it
 * in edit mode — this keeps the effect encapsulated inside a small dedicated
 * component (no bare useEffect in the parent view).
 */
import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InlineEditableTitleProps {
  value: string
  onSave: (title: string) => Promise<void> | void
  disabled?: boolean
}

export function InlineEditableTitle({ value, onSave, disabled }: InlineEditableTitleProps) {
  const [editing, setEditing] = useState<boolean>(false)
  const [draft, setDraft] = useState<string>(value)
  const [saving, setSaving] = useState<boolean>(false)

  const enterEdit = () => {
    if (disabled) return
    setDraft(value)
    setEditing(true)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  const commit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch {
      // mutation surfaces its own toast; stay in edit mode so the user can retry
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <h1
          className="min-w-0 flex-1 cursor-text text-2xl font-semibold leading-tight tracking-tight"
          onClick={enterEdit}
        >
          {value}
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={enterEdit}
          aria-label="编辑标题"
          disabled={disabled}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2">
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        className="h-10 flex-1 text-lg font-semibold"
        maxLength={200}
        disabled={saving}
      />
      <Button
        type="button"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => void commit()}
        disabled={saving || !draft.trim()}
        aria-label="保存标题"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 shrink-0"
        onClick={cancel}
        disabled={saving}
        aria-label="取消编辑"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
