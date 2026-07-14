/**
 * AppShell — 应用外壳：左侧持久导航 + 顶部栏 + 主内容区
 * 遵循 page-scroll-layout：根节点 h-screen flex overflow-hidden，
 * 内容区提供自身的滚动容器（feature 页面通过 flex 布局自行控制）。
 *
 * 顶部栏的「退出登录」在此闭环：走 useLogoutMutation。
 */
import { useLogoutMutation } from '@/features/auth/mutations'
import { SideNav } from '@/components/side-nav'
import { SkipLink } from '@/components/skip-link'
import { TopBar } from '@/components/top-bar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const logout = useLogoutMutation()

  const handleLogout = () => {
    logout.mutate()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <SkipLink />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onLogout={handleLogout} />
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
