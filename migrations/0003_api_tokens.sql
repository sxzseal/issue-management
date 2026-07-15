-- issue-management · api_tokens
-- Long-lived bearer tokens for external AI / script clients. Stored as
-- SHA-256(token) hex; the raw string is returned to the user only once at
-- creation. Revocation is a soft-delete (revoked_at) so past usage stays
-- visible in the settings UI.

CREATE TABLE api_tokens (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  token_hash    TEXT NOT NULL UNIQUE,       -- lowercase SHA-256 hex
  prefix        TEXT NOT NULL,              -- first 16 chars of raw token (e.g. "imt_live_ab3f2c")
  created_at    TEXT NOT NULL,
  last_used_at  TEXT,
  revoked_at    TEXT
);

-- Hot path: verify a bearer on every authenticated request. Partial index
-- keeps it lean (revoked tokens are dead rows for auth).
CREATE INDEX idx_api_tokens_hash_active
  ON api_tokens(token_hash)
  WHERE revoked_at IS NULL;
