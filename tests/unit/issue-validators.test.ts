import { describe, expect, it } from 'vitest'

import {
  BULK_LABELS_MAX,
  bulkCreateIssueBodySchema,
  bulkIssueLabelsBodySchema,
} from '../../src/lib/validators/issue'

describe('issue validators', () => {
  it('deduplicates bulk create label ids before enforcing the label limit', () => {
    const parsed = bulkCreateIssueBodySchema.parse({
      project_id: 'proj_inbox',
      titles: ['one'],
      label_ids: Array.from({ length: BULK_LABELS_MAX + 1 }, () => 'label_bug'),
    })

    expect(parsed.label_ids).toEqual(['label_bug'])
  })

  it('rejects bulk create requests with too many unique labels', () => {
    const parsed = bulkCreateIssueBodySchema.safeParse({
      project_id: 'proj_inbox',
      titles: ['one'],
      label_ids: Array.from(
        { length: BULK_LABELS_MAX + 1 },
        (_, i) => `label_${i}`,
      ),
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects empty label_ids in every bulk label mode', () => {
    for (const mode of ['add', 'remove', 'replace'] as const) {
      const parsed = bulkIssueLabelsBodySchema.safeParse({
        ids: ['iss_1'],
        label_ids: [],
        mode,
      })

      expect(parsed.success).toBe(false)
    }
  })
})
