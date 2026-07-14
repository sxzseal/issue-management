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
import { Link, useNavigate, useNavigationType } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Check, Link as LinkIcon, Package, PackageOpen, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { IssueDetail } from '@/lib/api-types'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { projectsQueryOptions } from '@/features/projects/queries'

import { useUpdateIssueMutation } from '../mutations'
import { DeleteIssueModal } from './dialogs/delete-issue.modal'

interface BreadcrumbActionsProps {
  issue: IssueDetail
}

export function BreadcrumbActions({ issue }: BreadcrumbActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const { copied, copy } = useCopyToClipboard()
  const update = useUpdateIssueMutation()
  const { data: projects } = useQuery(projectsQueryOptions)
  const navigate = useNavigate()
  const navigationType = useNavigationType()

  const project = projects?.find((p) => p.id === issue.project_id)
  const archived = issue.status === 'archived'

  const copyLink = () => {
    void copy(window.location.href, '链接已复制')
  }

  // Only walk back one step when React Router pushed the current entry (i.e.
  // the previous entry is also inside the SPA). On first entry from an external
  // link `navigationType` is 'POP', which would otherwise leave the app.
  const goBack = () => {
    if (navigationType === 'PUSH') {
      navigate(-1)
    } else {
      void navigate('/list')
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
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
        onClick={goBack}
        aria-label="返回"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">返回</span>
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
