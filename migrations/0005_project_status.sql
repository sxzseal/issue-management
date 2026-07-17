-- issue-management v1 · add project status
-- Target: Cloudflare D1 (SQLite dialect)
--
-- Project status is display-only: it groups projects in the sidebar and lets
-- the user mark a project as planning / active / archived. It does NOT gate
-- issue CRUD — issues can be created, edited, or deleted under a project in
-- ANY status.

ALTER TABLE projects
  ADD COLUMN status TEXT NOT NULL DEFAULT 'planning'
  CHECK (status IN ('planning', 'active', 'archived'));

ALTER TABLE projects ADD COLUMN archived_at TEXT;

-- Pre-existing rows predate this feature — treat them as active so the
-- upgrade doesn't demote everything to "planning".
UPDATE projects SET status = 'active';

CREATE INDEX idx_projects_status ON projects(status, sort_order);
