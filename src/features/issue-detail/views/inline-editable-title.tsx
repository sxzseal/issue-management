/**
 * InlineEditableTitle — H1 in view mode, controlled Input in edit mode.
 *
 * Reads its value (and writes updates) from `IssueDraftProvider`. The old
 * per-field editing/saving state moved to the page-level draft, so this
 * component is now a thin dumb-terminal — no local mutations, no toasts.
 */
import { Input } from '@/components/ui/input'

import { useIssueDraft } from '../lib/issue-draft'

export function InlineEditableTitle() {
  const { mode, title, patchTitle, saving } = useIssueDraft()

  if (mode === 'view') {
    return (
      <h1 className="text-2xl font-semibold leading-tight tracking-tight">
        {title}
      </h1>
    )
  }

  return (
    <Input
      value={title}
      onChange={(e) => patchTitle(e.target.value)}
      className="h-10 text-lg font-semibold"
      maxLength={200}
      placeholder="标题"
      disabled={saving}
    />
  )
}
