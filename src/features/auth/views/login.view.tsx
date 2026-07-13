import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { loginBodySchema, type LoginBody } from '@/lib/validators/auth'
import { RequestError } from '@/lib/request'
import { useLoginMutation } from '@/features/auth/mutations'

import { EyeToggle } from './eye-toggle'
import { RateLimitCountdown } from './rate-limit-countdown'

const DEFAULT_NEXT_PATH = '/board'
const RATE_LIMIT_MAX_SECONDS = 900
const RATE_LIMIT_DEFAULT_MINUTES = 5
const STATUS_UNAUTHORIZED = 40101
const STATUS_RATE_LIMITED = 42901

interface LocationState {
  from?: string
}

interface RateLimitState {
  isLimited: boolean
  seconds: number
}

function extractRateLimitSeconds(message: string): number {
  const match = message.match(/\d+/)
  const minutes = match ? parseInt(match[0], 10) : RATE_LIMIT_DEFAULT_MINUTES
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : RATE_LIMIT_DEFAULT_MINUTES
  return Math.min(safeMinutes * 60, RATE_LIMIT_MAX_SECONDS)
}

export function LoginView() {
  const navigate = useNavigate()
  const location = useLocation()
  const mutation = useLoginMutation()
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    isLimited: false,
    seconds: 0,
  })

  const form = useForm<LoginBody>({
    resolver: zodResolver(loginBodySchema),
    defaultValues: { password: '' },
    mode: 'onSubmit',
  })

  const nextPath =
    (location.state as LocationState | null)?.from ?? DEFAULT_NEXT_PATH

  const disabled = rateLimit.isLimited || mutation.isPending

  const onSubmit = (values: LoginBody) => {
    mutation.mutate(values, {
      onSuccess: () => {
        form.reset()
        navigate(nextPath, { replace: true })
      },
      onError: (error) => {
        if (error instanceof RequestError) {
          if (error.statusCode === STATUS_UNAUTHORIZED) {
            form.setError('password', { type: 'server', message: '密码错误' })
            return
          }
          if (error.statusCode === STATUS_RATE_LIMITED) {
            const seconds = extractRateLimitSeconds(error.message)
            setRateLimit({ isLimited: true, seconds })
            return
          }
        }
        form.setError('password', { type: 'server', message: '请稍后重试' })
      },
    })
  }

  return (
    <div
      className={cn(
        'min-h-screen w-full grid place-items-center bg-muted/40 px-4 py-10',
      )}
    >
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-input bg-card shadow-sm">
          <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-2">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                'bg-primary text-primary-foreground text-xl font-semibold shadow-sm',
              )}
              aria-hidden
            >
              I
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Issue 管理平台
            </h1>
            <p className="text-sm text-muted-foreground">主密码登录</p>
          </div>

          <div className="px-6 pb-2">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 pt-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        主密码
                        <span className="text-destructive"> *</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="请输入主密码"
                            autoComplete="current-password"
                            disabled={disabled}
                            className="pr-10"
                          />
                          <EyeToggle
                            show={showPassword}
                            onToggle={() => setShowPassword((v) => !v)}
                            disabled={disabled}
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={disabled}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中…
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>

                {rateLimit.isLimited ? (
                  <RateLimitCountdown
                    seconds={rateLimit.seconds}
                    onExpire={() =>
                      setRateLimit({ isLimited: false, seconds: 0 })
                    }
                  />
                ) : null}
              </form>
            </Form>
          </div>

          <div className="px-6 pb-6 pt-2">
            <p className="text-center text-xs text-muted-foreground">
              v1 · 单人个人产品
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
