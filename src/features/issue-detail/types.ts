import type { IssueDetail, Comment } from '@/lib/api-types'

export interface IssueDetailData {
  issue: IssueDetail
}

export interface CommentsData {
  list: Comment[]
  total: number
  page: number
  page_size: number
}
