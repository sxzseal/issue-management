/**
 * 顶层 React ErrorBoundary
 *
 * 捕获渲染阶段异常，展示统一的 ErrorState 并允许重置。
 * 生产环境可将 componentDidCatch 上报到 Sentry / 自研埋点。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/features/_shared/state'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.handleReset)
    return (
      <ErrorState
        title="出错了"
        description={error.message || '页面渲染异常'}
        onRetry={this.handleReset}
      />
    )
  }
}
