-- issue-management v2 · attachments (images + files) per issue
-- Target: Cloudflare D1 (SQLite dialect)
--
-- One row per uploaded file. Binary content lives in R2 under
-- `issues/<issue_id>/attachments/<attachment_id>` (see api/lib/attachments.ts).
-- ON DELETE CASCADE takes care of the DB rows when the parent issue is
-- deleted; the route layer is responsible for the corresponding R2 sweep
-- (see api/routes/issues.ts, DELETE /:id).

CREATE TABLE attachments (
  id           TEXT PRIMARY KEY,
  issue_id     TEXT NOT NULL,
  r2_key       TEXT NOT NULL UNIQUE,
  filename     TEXT NOT NULL CHECK (length(filename) BETWEEN 1 AND 255),
  size_bytes   INTEGER NOT NULL CHECK (size_bytes > 0),
  mime         TEXT NOT NULL CHECK (length(mime) BETWEEN 1 AND 255),
  uploaded_at  TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

-- Common lookup: list attachments for one issue, newest first.
CREATE INDEX idx_attachments_issue ON attachments(issue_id, uploaded_at DESC);
