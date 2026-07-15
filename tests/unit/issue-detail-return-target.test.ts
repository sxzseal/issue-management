import { describe, expect, it } from 'vitest'

import {
  DEFAULT_ISSUE_DETAIL_RETURN,
  getIssueDetailReturnTarget,
  makeIssueDetailLocationState,
} from '../../src/features/issue-detail/lib/return-target'

describe('issue detail return target', () => {
  it('keeps a board origin with query string', () => {
    const state = makeIssueDetailLocationState({
      pathname: '/board',
      search: '?project=proj_1',
      label: '看板',
    })

    expect(getIssueDetailReturnTarget(state)).toEqual({
      pathname: '/board',
      search: '?project=proj_1',
      label: '看板',
    })
  })

  it('keeps a list origin with filters', () => {
    const state = makeIssueDetailLocationState({
      pathname: '/list',
      search: '?status=todo&page=2',
      label: '列表',
    })

    expect(getIssueDetailReturnTarget(state)).toEqual({
      pathname: '/list',
      search: '?status=todo&page=2',
      label: '列表',
    })
  })

  it('falls back to list for missing or unknown state', () => {
    expect(getIssueDetailReturnTarget(undefined)).toEqual(
      DEFAULT_ISSUE_DETAIL_RETURN,
    )
    expect(
      getIssueDetailReturnTarget({
        from: { pathname: '/issue/iss_1', search: '?x=1', label: '看板' },
      }),
    ).toEqual(DEFAULT_ISSUE_DETAIL_RETURN)
  })

  it('drops malformed search strings', () => {
    expect(
      getIssueDetailReturnTarget({
        from: { pathname: '/board', search: 'status=todo', label: '列表' },
      }),
    ).toEqual({ pathname: '/board', search: '', label: '看板' })
  })
})
