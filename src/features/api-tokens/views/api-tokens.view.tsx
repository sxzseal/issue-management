/**
 * ApiTokensView — /settings/api-tokens 主视图
 *
 * 组合 IntroCard / CreateTokenCard / TokensListCard / ExamplesCard;
 * 加载 / 错误状态复用 _shared/state。
 */
import { useQuery } from '@tanstack/react-query'

import { ErrorState, Loading } from '@/features/_shared/state'

import { apiTokensQueries } from '../queries'
import { IntroCard } from './intro-card'
import { CreateTokenCard } from './create-token-card'
import { TokensListCard } from './tokens-list-card'
import { ExamplesCard } from './examples-card'

export function ApiTokensView() {
  const { data, isPending, isError, refetch } = useQuery(
    apiTokensQueries.list(),
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <IntroCard />
          <CreateTokenCard />
          {isPending ? (
            <Loading />
          ) : isError ? (
            <ErrorState
              title="加载失败"
              description="无法读取 API Token 列表，请稍后重试"
              onRetry={() => void refetch()}
            />
          ) : (
            <TokensListCard tokens={data} />
          )}
          <ExamplesCard />
        </div>
      </div>
    </div>
  )
}
