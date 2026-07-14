-- issue-management v1 · initial schema
-- Target: Cloudflare D1 (SQLite dialect)
-- Reminder: at runtime the D1 binding auto-enables foreign_keys; when executing
-- via `wrangler d1 execute` you may need `PRAGMA foreign_keys = ON;` before DML.

-- BEGIN; (removed for D1 compatibility)

------------------------------------------------------------------------------
-- projects
------------------------------------------------------------------------------
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL,
  is_inbox    INTEGER NOT NULL DEFAULT 0 CHECK (is_inbox IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Enforce at most ONE inbox project (partial unique index on is_inbox = 1).
CREATE UNIQUE INDEX idx_projects_single_inbox
  ON projects(is_inbox)
  WHERE is_inbox = 1;

------------------------------------------------------------------------------
-- labels
------------------------------------------------------------------------------
CREATE TABLE labels (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

------------------------------------------------------------------------------
-- issues
------------------------------------------------------------------------------
CREATE TABLE issues (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  title         TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body          TEXT,
  body_r2_key   TEXT,
  status        TEXT NOT NULL CHECK (status IN ('todo','in_progress','done','archived')),
  priority      TEXT NOT NULL CHECK (priority IN ('p0','p1','p2','p3')),
  due_date      TEXT,
  external_ref  TEXT UNIQUE,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','webhook')),
  source_name   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  archived_at   TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE INDEX idx_issues_project_status  ON issues(project_id, status);
CREATE INDEX idx_issues_status_priority ON issues(status, priority);
CREATE INDEX idx_issues_due_date        ON issues(due_date);
-- Composite index covers the common "recent issues in a project" query
-- (list/board views filter by project_id, order by updated_at DESC) as an
-- index range scan with no filesort step.
CREATE INDEX idx_issues_project_updated ON issues(project_id, updated_at DESC);
CREATE INDEX idx_issues_updated_at      ON issues(updated_at);

------------------------------------------------------------------------------
-- issue_labels (M2M)
------------------------------------------------------------------------------
CREATE TABLE issue_labels (
  issue_id  TEXT NOT NULL,
  label_id  TEXT NOT NULL,
  PRIMARY KEY (issue_id, label_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

CREATE INDEX idx_issue_labels_label ON issue_labels(label_id);

------------------------------------------------------------------------------
-- comments
------------------------------------------------------------------------------
CREATE TABLE comments (
  id          TEXT PRIMARY KEY,
  issue_id    TEXT NOT NULL,
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  created_at  TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_issue ON comments(issue_id, created_at DESC);

------------------------------------------------------------------------------
-- webhook_logs
------------------------------------------------------------------------------
CREATE TABLE webhook_logs (
  id             TEXT PRIMARY KEY,
  source         TEXT NOT NULL,
  event_id       TEXT NOT NULL UNIQUE,
  event_type     TEXT NOT NULL,
  payload        TEXT NOT NULL,
  http_status    INTEGER NOT NULL,
  error_summary  TEXT,
  issue_id       TEXT,
  received_at    TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE SET NULL
);

CREATE INDEX idx_webhook_logs_received ON webhook_logs(received_at DESC);
CREATE INDEX idx_webhook_logs_source   ON webhook_logs(source, received_at DESC);
-- Partial index on the FK column so the ON DELETE SET NULL cascade + any
-- "webhook logs for this issue" lookup runs in O(log n) instead of a table
-- scan. Excludes the NULL majority (rate-limit / signature-failure rows).
CREATE INDEX idx_webhook_logs_issue ON webhook_logs(issue_id) WHERE issue_id IS NOT NULL;

-- COMMIT; (removed for D1 compatibility)
