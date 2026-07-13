import type { Meta, StoryObj } from '@storybook/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

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

import { authHandlers } from '../../../mocks/handlers/auth'
import {
  BRAND,
  LOGIN_MESSAGES,
  RATE_LIMITED_STATE,
  defaultLoginValues,
  loginSchema,
  type LoginFormValues,
} from './auth.fixtures'
import './_shared/theme.css'

interface LoginCardProps {
  /** 预置错误：进入即在密码栏显示错误（用于 LoginError 场景） */
  preloadedError?: string
  /** 冻结场景：整个表单禁用 + 展示倒计时文案 */
  rateLimited?: boolean
  /** 冻结倒计时展示（如 5:00） */
  countdownLabel?: string
}

function LoginCard({
  preloadedError,
  rateLimited = false,
  countdownLabel = RATE_LIMITED_STATE.frozenUntilLabel,
}: LoginCardProps) {
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: defaultLoginValues,
    mode: 'onSubmit',
  })

  // 预置错误：进入即显示密码错误（模拟一次失败后的状态）
  if (preloadedError && !form.formState.errors.password) {
    form.setError('password', { type: 'server', message: preloadedError })
  }

  const isSubmitting = form.formState.isSubmitting
  const disabled = rateLimited || isSubmitting

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = (await res.json()) as {
        status_code: number
        message?: string
        data: unknown
      }
      if (json.status_code !== 0) {
        form.setError('password', {
          type: 'server',
          message: json.message ?? LOGIN_MESSAGES.wrongPassword,
        })
      } else {
        form.reset()
      }
    } catch {
      form.setError('password', {
        type: 'server',
        message: LOGIN_MESSAGES.wrongPassword,
      })
    }
  }

  return (
    <div
      className={cn(
        'theme-issue-management',
        'min-h-screen w-full grid place-items-center bg-muted/40 px-4 py-10',
      )}
    >
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-input bg-background shadow-sm">
          <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-2">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                'bg-primary text-primary-foreground text-xl font-semibold shadow-sm',
              )}
              aria-hidden
            >
              {BRAND.initial}
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {BRAND.productName}
            </h1>
            <p className="text-sm text-muted-foreground">{BRAND.tagline}</p>
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
                        {LOGIN_MESSAGES.passwordLabel}
                        <span className="text-destructive"> *</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder={LOGIN_MESSAGES.passwordPlaceholder}
                            autoComplete="current-password"
                            disabled={disabled}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            aria-label={
                              showPassword
                                ? LOGIN_MESSAGES.hidePassword
                                : LOGIN_MESSAGES.showPassword
                            }
                            onClick={() => setShowPassword((v) => !v)}
                            className={cn(
                              'absolute right-2 top-1/2 -translate-y-1/2',
                              'inline-flex h-7 w-7 items-center justify-center rounded-md',
                              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              'disabled:opacity-50 disabled:pointer-events-none',
                            )}
                            disabled={disabled}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {rateLimited ? (
                  <p
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {LOGIN_MESSAGES.frozen}
                    <span className="ml-1 text-muted-foreground">
                      {LOGIN_MESSAGES.countdown(countdownLabel)}
                    </span>
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={disabled}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {LOGIN_MESSAGES.submitting}
                    </>
                  ) : (
                    LOGIN_MESSAGES.submit
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <div className="px-6 pb-6 pt-2">
            <p className="text-center text-xs text-muted-foreground">
              {BRAND.footer}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const meta: Meta<typeof LoginCard> = {
  title: 'issue-management / 登录',
  component: LoginCard,
  parameters: {
    layout: 'centered',
    msw: { handlers: authHandlers },
    viewport: { defaultViewport: 'laptop' },
  },
  tags: ['autodocs'],
}

export default meta

type Story = StoryObj<typeof LoginCard>

export const v1: Story = {
  name: 'v1',
  tags: ['draft'],
  args: {},
}

export const LoginError: Story = {
  name: 'LoginError',
  args: {
    preloadedError: LOGIN_MESSAGES.wrongPassword,
  },
}

export const RateLimited: Story = {
  name: 'RateLimited',
  args: {
    rateLimited: true,
    countdownLabel: RATE_LIMITED_STATE.frozenUntilLabel,
  },
}
