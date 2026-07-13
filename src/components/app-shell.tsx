/**
 * AppShell — 应用外壳：左侧持久导航 + 顶部栏 + 主内容区
 * 遵循 page-scroll-layout：根节点 h-screen flex overflow-hidden，
 * 内容区提供自身的滚动容器（feature 页面通过 flex 布局自行控制）。
 */
import { SideNav } from '@/components/side-nav'
import { TopBar } from '@/components/top-bar'

interface AppShellProps {
  children: React.ReactNode
  onNewIssue?: () => void
  onLogout?: () => void
}

export function AppShell({ children, onNewIssue, onLogout }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-primary-foreground"
      >
        跳到主内容
      </a>
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onNewIssue={onNewIssue} onLogout={onLogout} />
        <main
          id="main"
          role="main"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
