/**
 * CreateTokenCard — 输入 name → 生成 token。成功后打开 TokenCreatedModal
 * 一次性展示明文，随后清空输入框，列表由 mutation 的 invalidate 自动刷新。
 */
import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateApiTokenMutation } from '../mutations'
import { TokenCreatedModal } from './dialogs/token-created.modal'

const MAX_NAME_LEN = 60

export function CreateTokenCard() {
  const [name, setName] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [issuedToken, setIssuedToken] = useState<string | null>(null)
  const [issuedName, setIssuedName] = useState<string | null>(null)
  const mutation = useCreateApiTokenMutation()

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && !mutation.isPending

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!canSubmit) return
    try {
      const res = await mutation.mutateAsync(trimmed)
      setIssuedToken(res.token)
      setIssuedName(res.name)
      setModalOpen(true)
      setName('')
    } catch {
      // toast handled in mutation.onError
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">生成新 Token</CardTitle>
          <CardDescription>为一个客户端（例如 "Claude Code 本机"）单独发一枚，方便日后按需撤销</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="api-token-name">名称</Label>
              <Input
                id="api-token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_NAME_LEN}
                placeholder="Claude Code 本机 / CI runner 等"
                disabled={mutation.isPending}
              />
            </div>
            <Button type="submit" disabled={!canSubmit} className="gap-1.5 sm:w-auto">
              {mutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}
              生成 Token
            </Button>
          </form>
        </CardContent>
      </Card>

      <TokenCreatedModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            // Scrub the plaintext once the user closes — no lingering state.
            setIssuedToken(null)
            setIssuedName(null)
          }
        }}
        token={issuedToken}
        name={issuedName}
      />
    </>
  )
}
