/**
 * ProjectManageDialog — projects CRUD in one modal.
 *
 * Lists existing projects with inline edit / delete, plus a create form.
 * Backed by /api/projects (list/create/update/delete). Inbox project is
 * read-only (name locked, delete blocked) per contract.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2, X, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RequestError } from '@/lib/request'
import type { Project } from '@/lib/api-types'
import {
  createProjectBodySchema,
  type CreateProjectBody,
  type UpdateProjectBody,
} from '@/lib/validators/project'
import { ErrorCodes } from '@/lib/error-codes'
import { projectsQueryOptions } from '../queries'
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from '../mutations'

const DEFAULT_COLOR = '#6366f1'

interface ProjectManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectManageDialog({
  open,
  onOpenChange,
}: ProjectManageDialogProps) {
  const projects = useQuery(projectsQueryOptions)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>管理项目</DialogTitle>
          <DialogDescription>
            创建、重命名或删除项目。Inbox 为系统内置项目，不可删除或改名。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {projects.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              加载中…
            </div>
          ) : (projects.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无项目</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {(projects.data ?? []).map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </ul>
          )}
        </div>

        <CreateProjectForm />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Row (view / edit modes; delete opens a nested confirm dialog)
// ---------------------------------------------------------------------------

type RowMode = 'view' | 'edit'

interface ProjectRowProps {
  project: Project
}

function ProjectRow({ project }: ProjectRowProps) {
  const [mode, setMode] = useState<RowMode>('view')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(project.name)
  const [color, setColor] = useState(project.color)
  const updateMutation = useUpdateProjectMutation()

  const resetEdit = () => {
    setName(project.name)
    setColor(project.color)
    setMode('view')
  }

  const submitEdit = () => {
    const body: UpdateProjectBody = {}
    if (name !== project.name) body.name = name.trim()
    if (color !== project.color) body.color = color
    if (Object.keys(body).length === 0) {
      setMode('view')
      return
    }
    updateMutation.mutate(
      { id: project.id, body },
      { onSuccess: () => setMode('view') },
    )
  }

  if (mode === 'edit') {
    return (
      <li className="flex items-center gap-2 px-3 py-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-6 w-6 flex-none cursor-pointer rounded border border-input bg-transparent"
          aria-label="项目颜色"
          disabled={updateMutation.isPending}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          disabled={project.is_inbox || updateMutation.isPending}
          className="h-8"
          aria-label="项目名称"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={submitEdit}
          disabled={updateMutation.isPending || !name.trim()}
          aria-label="保存"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={resetEdit}
          disabled={updateMutation.isPending}
          aria-label="取消"
        >
          <X className="h-4 w-4" />
        </Button>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span
        aria-hidden
        className="h-2 w-2 flex-none rounded-full"
        style={{ backgroundColor: project.color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm">
        {project.name}
        {project.is_inbox ? (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Inbox
          </span>
        ) : null}
      </span>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setMode('edit')}
        aria-label="编辑项目"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setDeleteOpen(true)}
        disabled={project.is_inbox}
        aria-label="删除项目"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <DeleteProjectDialog
        project={project}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </li>
  )
}

// ---------------------------------------------------------------------------
// Delete confirm dialog (nested)
// ---------------------------------------------------------------------------

interface DeleteProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const deleteMutation = useDeleteProjectMutation()

  const errorAsRequest =
    deleteMutation.error instanceof RequestError ? deleteMutation.error : null
  const hasIssuesConflict =
    errorAsRequest?.statusCode === ErrorCodes.CONSTRAINT_CONFLICT
  // Non-conflict failure of a `reject` attempt: surface the actual message and
  // still let the user escalate to `reassign` instead of silently re-issuing
  // the same call. Without this, an unrelated 500/401/network error leaves the
  // dialog stuck retrying the non-cascading path.
  const nonConflictError =
    deleteMutation.isError && !hasIssuesConflict
      ? errorAsRequest?.message ?? '删除失败，请重试'
      : null

  const handleOpenChange = (next: boolean) => {
    if (!next) deleteMutation.reset()
    onOpenChange(next)
  }

  const runDelete = (cascade: 'reject' | 'reassign') => {
    deleteMutation.mutate(
      { id: project.id, cascade },
      { onSuccess: () => handleOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除项目</DialogTitle>
          <DialogDescription>
            {hasIssuesConflict
              ? '该项目下存在 issue。删除项目会把这些 issue 移入 Inbox 后再删除，操作不可撤销。'
              : '删除后不可恢复。请确认要删除该项目。'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <span
            aria-hidden
            className="h-2 w-2 flex-none rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
        </div>

        {nonConflictError ? (
          <p className="text-xs text-destructive">{nonConflictError}</p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            取消
          </Button>
          {nonConflictError ? (
            <Button
              variant="outline"
              onClick={() => runDelete('reassign')}
              disabled={deleteMutation.isPending}
            >
              强制移入 Inbox 并删除
            </Button>
          ) : null}
          <Button
            variant="destructive"
            onClick={() => runDelete(hasIssuesConflict ? 'reassign' : 'reject')}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            {hasIssuesConflict ? '移入 Inbox 并删除' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------

function CreateProjectForm() {
  const createMutation = useCreateProjectMutation()
  const form = useForm<CreateProjectBody>({
    resolver: zodResolver(createProjectBodySchema),
    defaultValues: { name: '', color: DEFAULT_COLOR },
  })

  const onSubmit = (values: CreateProjectBody) => {
    createMutation.mutate(values, {
      onSuccess: () => form.reset({ name: '', color: DEFAULT_COLOR }),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-2 rounded-md border border-dashed border-border p-3"
      >
        <p className="text-xs font-medium text-muted-foreground">新建项目</p>
        <div className="flex items-start gap-2">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem className="flex-none space-y-0">
                <FormControl>
                  <input
                    type="color"
                    value={field.value}
                    onChange={field.onChange}
                    className="h-9 w-9 cursor-pointer rounded-md border border-input bg-transparent p-1"
                    aria-label="新项目颜色"
                    title="选择颜色"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1 space-y-1">
                <FormControl>
                  <Input
                    {...field}
                    placeholder="例如：Growth 实验"
                    maxLength={50}
                    className="h-9"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending}
            className="h-9 flex-none"
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            添加
          </Button>
        </div>
      </form>
    </Form>
  )
}
