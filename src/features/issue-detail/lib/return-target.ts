export interface IssueDetailReturnTarget {
  pathname: '/board' | '/list'
  search: string
  label: '看板' | '列表'
}

export interface IssueDetailLocationState {
  from?: IssueDetailReturnTarget
}

export const DEFAULT_ISSUE_DETAIL_RETURN: IssueDetailReturnTarget = {
  pathname: '/list',
  search: '',
  label: '列表',
}

export function makeIssueDetailLocationState(
  target: IssueDetailReturnTarget,
): IssueDetailLocationState {
  return { from: target }
}

function isKnownPathname(pathname: unknown): pathname is '/board' | '/list' {
  return pathname === '/board' || pathname === '/list'
}

function labelForPathname(pathname: '/board' | '/list'): '看板' | '列表' {
  return pathname === '/board' ? '看板' : '列表'
}

export function getIssueDetailReturnTarget(
  state: unknown,
): IssueDetailReturnTarget {
  if (!state || typeof state !== 'object') return DEFAULT_ISSUE_DETAIL_RETURN

  const maybeFrom = (state as IssueDetailLocationState).from
  if (!maybeFrom || !isKnownPathname(maybeFrom.pathname)) {
    return DEFAULT_ISSUE_DETAIL_RETURN
  }

  return {
    pathname: maybeFrom.pathname,
    search:
      typeof maybeFrom.search === 'string' && maybeFrom.search.startsWith('?')
        ? maybeFrom.search
        : '',
    label: labelForPathname(maybeFrom.pathname),
  }
}
