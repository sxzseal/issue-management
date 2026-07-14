/**
 * LabelManageDialog — labels CRUD in one modal.
 *
 * Lists existing labels with inline edit / delete, plus a create form.
 * Backed by /api/labels (list/create/update/delete). Deleting a label
 * removes it from all issues via FK cascade.
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
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { Label } from '@/lib/api-types'
import {
  createLabelBodySchema,
  type CreateLabelBody,
  type UpdateLabelBody,
} from '@/lib/validators/label'
import { labelsQueryOptions } from '../queries'
import {
  useCreateLabelMutation,
  useDeleteLabelMutation,
  useUpdateLabelMutation,
} from '../mutations'

const DEFAULT_COLOR = '#6366f1'

interface LabelManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LabelManageDialog({ open, onOpenChange }: LabelManageDialogProps) {
  const labels = useQuery(labelsQueryOptions)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>管理标签</DialogTitle>
          <DialogDescription>
            创建、重命名或删除标签。删除后会自动从所有 issue 上移除。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {labels.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              加载中…
            </div>
          ) : (labels.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无标签</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {(labels.data ?? []).map((l) => (
                <LabelRow key={l.id} label={l} />
              ))}
            </ul>
          )}
        </div>

        <CreateLabelForm />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type RowMode = 'view' | 'edit'

interface LabelRowProps {
  label: Label
}

function LabelRow({ label }: LabelRowProps) {
  const [mode, setMode] = useState<RowMode>('view')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(label.name)
  const [color, setColor] = useState(label.color)
  const updateMutation = useUpdateLabelMutation()

  const resetEdit = () => {
    setName(label.name)
    setColor(label.color)
    setMode('view')
  }

  const submitEdit = () => {
    const body: UpdateLabelBody = {}
    if (name !== label.name) body.name = name.trim()
    if (color !== label.color) body.color = color
    if (Object.keys(body).length === 0) {
      setMode('view')
      return
    }
    updateMutation.mutate(
      { id: label.id, body },
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
          aria-label="标签颜色"
          disabled={updateMutation.isPending}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          disabled={updateMutation.isPending}
          className="h-8"
          aria-label="标签名称"
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
        style={{ backgroundColor: label.color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{label.name}</span>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setMode('edit')}
        aria-label="编辑标签"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setDeleteOpen(true)}
        aria-label="删除标签"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <DeleteLabelDialog
        label={label}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </li>
  )
}

interface DeleteLabelDialogProps {
  label: Label
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DeleteLabelDialog({ label, open, onOpenChange }: DeleteLabelDialogProps) {
  const deleteMutation = useDeleteLabelMutation()

  const runDelete = () => {
    deleteMutation.mutate(label.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除标签</DialogTitle>
          <DialogDescription>
            删除后不可恢复，且会从所有 issue 上移除该标签。
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <span
            aria-hidden
            className="h-2 w-2 flex-none rounded-full"
            style={{ backgroundColor: label.color }}
          />
          <span className="min-w-0 flex-1 truncate text-sm">{label.name}</span>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={runDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateLabelForm() {
  const createMutation = useCreateLabelMutation()
  const form = useForm<CreateLabelBody>({
    resolver: zodResolver(createLabelBodySchema),
    defaultValues: { name: '', color: DEFAULT_COLOR },
  })

  const onSubmit = (values: CreateLabelBody) => {
    createMutation.mutate(values, {
      onSuccess: () => form.reset({ name: '', color: DEFAULT_COLOR }),
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex items-end gap-2 rounded-md border border-dashed border-border p-3"
      >
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem className="flex-none">
              <FormLabel className="text-xs">颜色</FormLabel>
              <FormControl>
                <input
                  type="color"
                  value={field.value}
                  onChange={field.onChange}
                  className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent"
                  aria-label="新标签颜色"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="min-w-0 flex-1">
              <FormLabel className="text-xs">新标签名称</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="例如：bug / v2 / discovery"
                  maxLength={30}
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
          className="h-9"
        >
          {createMutation.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" />
          )}
          添加
        </Button>
      </form>
    </Form>
  )
}
