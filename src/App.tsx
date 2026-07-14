import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
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

/**
 * Layout route for all authenticated pages. Mounts the shell once and renders
 * child routes into an <Outlet/>, so navigating between /board /list /issue/:id
 * doesn't remount SideNav / TopBar and refresh their query subscriptions.
 */
function GuardedShellLayout() {
  useAuthGuard()
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
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
            <Route element={<GuardedShellLayout />}>
              <Route path="/board" element={<BoardRoute />} />
              <Route path="/list" element={<ListRoute />} />
              <Route path="/issue/:id" element={<IssueDetailRoute />} />
              <Route path="/settings/webhook" element={<WebhookSettingsRoute />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  )
}
