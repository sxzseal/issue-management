/**
 * BreadcrumbActions — top row of the detail view (AC-051).
 *
 * - Left: breadcrumb「项目名 / issue #<id>」
 * - Right: Copy Link · Archive/Unarchive · Delete
 *
 * The Archive button toggles `status` between `archived` and its previous
 * value; for v1 we simply flip archived <-> todo on the way out. Delete opens
 * the confirmation modal.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Check, Link as LinkIcon, Package, PackageOpen, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { request } from '@/lib/request'
import type { IssueDetail, Project } from '@/lib/api-types'

import { useUpdateIssueMutation } from '../mutations'
import { DeleteIssueModal } from './dialogs/delete-issue.modal'

const projectsListQuery = queryOptions({
  queryKey: ['projects', 'list'] as const,
  queryFn: () => request<Project[]>('/api/projects'),
  staleTime: 60_000,
})

interface BreadcrumbActionsProps {
  issue: IssueDetail
}

export function BreadcrumbActions({ issue }: BreadcrumbActionsProps) {
  const [copied, setCopied] = useState<boolean>(false)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const update = useUpdateIssueMutation()
  const { data: projects } = useQuery(projectsListQuery)

  const project = projects?.find((p) => p.id === issue.project_id)
  const archived = issue.status === 'archived'

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
      toast.success('链接已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  const toggleArchive = () => {
    update.mutate({
      id: issue.id,
      body: { status: archived ? 'todo' : 'archived' },
    })
  }

  return (
    <div className="flex h-12 flex-none items-center gap-2 border-b border-border bg-card/40 px-4">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
      >
        <Link to="/list">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">返回列表</span>
        </Link>
      </Button>
      <Separator orientation="vertical" className="h-5" />
      <nav aria-label="面包屑" className="min-w-0 truncate text-sm text-muted-foreground">
        <Link to="/board" className="hover:text-foreground">
          {project?.name ?? '项目'}
        </Link>
        <span className="mx-1.5" aria-hidden>/</span>
        <span className="font-mono text-xs">issue #{issue.id}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => void copyLink()}
          aria-label="复制链接"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <LinkIcon className="h-3.5 w-3.5" />
              <span>复制链接</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5"
          onClick={toggleArchive}
          disabled={update.isPending}
          aria-label={archived ? '取消归档' : '归档'}
        >
          {archived ? (
            <>
              <PackageOpen className="h-3.5 w-3.5" />
              <span>取消归档</span>
            </>
          ) : (
            <>
              <Package className="h-3.5 w-3.5" />
              <span>归档</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          aria-label="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>删除</span>
        </Button>
      </div>

      <DeleteIssueModal issueId={issue.id} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}
