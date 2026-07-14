/**
 * WebhookSettingsView — /settings/webhook 主视图（AC-071 / AC-077）
 *
 * 组合 IntroCard / EndpointCard / SecretCard / ExamplesCard / LogsCard；
 * 顶部 PageHeader 由 _shared/page 提供，Loading / Error 走 _shared/state。
 *
 * 布局：内部 flex column 占满 AppShell main，滚动只发生在内容区。
 */
import { useQuery } from '@tanstack/react-query'

import { ErrorState, Loading } from '@/features/_shared/state'

import { webhookSettingsQueries } from '../queries'
import { IntroCard } from './intro-card'
import { EndpointCard } from './endpoint-card'
import { SecretCard } from './secret-card'
import { ExamplesCard } from './examples-card'
import { LogsCard } from './logs-card'

const RECENT_LIMIT = 20

export function WebhookSettingsView() {
  const { data, isPending, isError, refetch } = useQuery(
    webhookSettingsQueries.recent(RECENT_LIMIT)
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <IntroCard />
          {isPending ? (
            <Loading />
          ) : isError ? (
            <ErrorState
              title="加载失败"
              description="无法读取 webhook 设置，请稍后重试"
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              <EndpointCard />
              <SecretCard maskedSecret={data.secret_masked} />
              <ExamplesCard />
              <LogsCard logs={data.list} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
