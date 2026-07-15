-- issue-management · drop webhook feature, migrate issues.source
-- ('manual','webhook') → ('manual','api').
--
-- SQLite can't modify a CHECK constraint in place, so we rebuild `issues`.
-- Foreign-key enforcement is disabled around the rebuild so that dropping
-- and renaming the table does not cascade-delete rows in `issue_labels` or
-- `comments`. `PRAGMA foreign_keys` is per-connection; D1 honors it.

PRAGMA foreign_keys = OFF;

------------------------------------------------------------------------------
-- 1) Drop webhook_logs + its indexes (has an FK to issues, must go first).
------------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_webhook_logs_issue;
DROP INDEX IF EXISTS idx_webhook_logs_source;
DROP INDEX IF EXISTS idx_webhook_logs_received;
DROP TABLE IF EXISTS webhook_logs;

------------------------------------------------------------------------------
-- 2) Rebuild `issues` with the new CHECK constraint and migrate 'webhook' →
--    'api'. Existing source_name values are preserved (e.g. 'linear',
--    'github'); they become the human label on the new API-origin badge.
------------------------------------------------------------------------------
CREATE TABLE issues_new (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body          TEXT,
  body_r2_key   TEXT,
  status        TEXT NOT NULL CHECK (status IN ('todo','in_progress','done','archived')),
  priority      TEXT NOT NULL CHECK (priority IN ('p0','p1','p2','p3')),
  due_date      TEXT,
  external_ref  TEXT UNIQUE,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','api')),
  source_name   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  archived_at   TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

INSERT INTO issues_new
  (id, project_id, title, body, body_r2_key, status, priority,
   due_date, external_ref, source, source_name,
   created_at, updated_at, archived_at)
SELECT
  id, project_id, title, body, body_r2_key, status, priority,
  due_date, external_ref,
  CASE source WHEN 'webhook' THEN 'api' ELSE source END,
  source_name,
  created_at, updated_at, archived_at
FROM issues;

DROP TABLE issues;
ALTER TABLE issues_new RENAME TO issues;

------------------------------------------------------------------------------
-- 3) Recreate indexes (they don't survive the rebuild).
------------------------------------------------------------------------------
CREATE INDEX idx_issues_project_status  ON issues(project_id, status);
CREATE INDEX idx_issues_status_priority ON issues(status, priority);
CREATE INDEX idx_issues_due_date        ON issues(due_date);
CREATE INDEX idx_issues_project_updated ON issues(project_id, updated_at DESC);
CREATE INDEX idx_issues_updated_at      ON issues(updated_at);

PRAGMA foreign_keys = ON;
