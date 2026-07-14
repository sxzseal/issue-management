import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/app-shell'
import { OfflineBanner } from './components/offline-banner'
import { Loading } from './features/_shared/state'
import { useAuthGuard } from './hooks/use-auth-guard'
import { Providers } from './providers'

const BoardRoute = lazy(() => import('./routes/board.route'))
const IssueDetailRoute = lazy(() => import('./routes/issue-detail.route'))
const ListRoute = lazy(() => import('./routes/list.route'))
const LoginRoute = lazy(() => import('./routes/login.route'))
const NotFoundRoute = lazy(() => import('./routes/not-found.route'))
const WebhookSettingsRoute = lazy(() => import('./routes/webhook-settings.route'))

function GuardedShell({ children }: { children: ReactNode }) {
  useAuthGuard()
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </AppShell>
  )
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <OfflineBanner />
        <Suspense fallback={<Loading />}>
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
        </Suspense>
      </BrowserRouter>
    </Providers>
  )
}
