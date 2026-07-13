# features/webhook-settings

**Purpose**: /settings/webhook route data layer — recent inbound webhook log rows + masked secret + rotate action.

## Public surface
- `webhookSettingsQueries.recent(limit?)` — returns `{ list: WebhookLog[], secret_masked: string }`; default limit 20, max 50 (server-enforced)
- `useRotateWebhookSecretMutation()` — POST rotate-secret; returns `{ secret, rotated_at }` ONCE (must be shown to user and not persisted client-side per AC-073)

## Cache keys
- `['webhook-settings', 'recent', limit]`

## AC coverage
- AC-071 (recent 20 logs + secret card + rotate button in settings page — data layer only; UI is separate)
- AC-072 (secret masked server-side; client only sees `wh_secret_...•••3f2a` style)
- AC-073 (rotate returns fresh secret ONCE; UI must display + not cache)
