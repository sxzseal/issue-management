import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/app-shell'
import { OfflineBanner } from './components/offline-banner'
import { useAuthGuard } from './hooks/use-auth-guard'
import { Providers } from './providers'

import BoardRoute from './routes/board.route'
import IssueDetailRoute from './routes/issue-detail.route'
import ListRoute from './routes/list.route'
import LoginRoute from './routes/login.route'
import NotFoundRoute from './routes/not-found.route'
import WebhookSettingsRoute from './routes/webhook-settings.route'

/**
 * Wraps guarded routes with auth guard + AppShell chrome. The guard runs
 * every route change; on unauthenticated state it navigates to /login with
 * `?next=<current>` so the redirect returns the user where they were.
 */
function GuardedShell({ children }: { children: ReactNode }) {
  useAuthGuard()
  return <AppShell>{children}</AppShell>
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<Navigate to="/board" replace />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/board"
            element={
              <GuardedShell>
                <BoardRoute />
              </GuardedShell>
            }
          />
          <Route
            path="/list"
            element={
              <GuardedShell>
                <ListRoute />
              </GuardedShell>
            }
          />
          <Route
            path="/issue/:id"
            element={
              <GuardedShell>
                <IssueDetailRoute />
              </GuardedShell>
            }
          />
          <Route
            path="/settings/webhook"
            element={
              <GuardedShell>
                <WebhookSettingsRoute />
              </GuardedShell>
            }
          />
          <Route
            path="*"
            element={
              <GuardedShell>
                <NotFoundRoute />
              </GuardedShell>
            }
          />
        </Routes>
      </BrowserRouter>
    </Providers>
  )
}
