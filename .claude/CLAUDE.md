# issue-management

> Built with ai-forge — AI-driven development framework

## Tech Stack (v1 — Cloudflare 边缘部署)

- **前端**: Vite 6 + React 19 + React Router 7 + TypeScript 5.7 (strict)
- **UI**: shadcn/ui + Tailwind CSS 3 + next-themes (light/dark class)
- **数据**: TanStack Query v5 + TanStack Form + TanStack Table
- **后端**: Hono 4 on Cloudflare Workers (`api/index.ts`)
- **存储**: Cloudflare D1 (SQLite) + R2 (issue body_full 溢出) + KV (JWT 黑名单 + rate limit)
- **原型**: Storybook 10 (`@storybook/react-vite`) + MSW 2
- **测试**: Vitest (unit/integration) + Playwright (e2e)
- **部署**: Cloudflare Pages + Workers（`wrangler deploy`）

## Directory Conventions

```
.
├── index.html                    # Vite 入口 HTML
├── src/
│   ├── main.tsx                  # React 挂载
│   ├── App.tsx                   # 顶层组件（Providers + Router）
│   ├── vite-env.d.ts
│   ├── styles/globals.css        # Tailwind base + 主题 CSS 变量
│   ├── components/
│   │   ├── ui/                   # L1: shadcn/ui atoms (read-only, do not modify)
│   │   ├── theme-provider.tsx    # next-themes wrapper
│   │   └── theme-toggle.tsx      # light/dark/system 切换
│   ├── features/                 # L3: 业务功能模块
│   │   ├── _shared/              # L2: 项目级共享原语
│   │   │   ├── state/            #   Loading / Skeleton / Empty / Error
│   │   │   └── form/             #   FormField / formErrorText
│   │   └── <domain>/             # 单个 feature（queries, mutations, views, MANIFEST）
│   ├── routes/                   # React Router route 组件
│   ├── hooks/                    # 全局自定义 hooks (use-auth-guard, use-offline)
│   ├── lib/
│   │   ├── utils.ts              # cn() helper
│   │   ├── api-response.ts       # ApiResponse<T> 信封类型
│   │   ├── request.ts            # request<T>() — fetch 封装
│   │   └── validators/           # Zod schemas per resource
│   └── stories/                  # Storybook 组件文档（迁栈后保留）
├── api/                          # Cloudflare Worker (Hono)
│   ├── index.ts                  # Hono app + middleware + routes 挂载
│   ├── routes/                   # 按资源分组：auth/projects/labels/issues/comments/webhook
│   ├── lib/                      # jwt / auth / webhook-sig / db / r2-body / pagination
│   ├── middleware/               # auth-guard / cors / error-handler / envelope
│   └── tsconfig.json             # Worker 专用 tsconfig (workers-types)
├── migrations/                   # D1 SQL migrations（0001_init.sql, 0002_seed.sql）
├── mocks/                        # MSW handlers + fixtures（仅用于 Storybook）
├── wrangler.toml                 # Cloudflare Workers 配置
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json / tsconfig.node.json
```

## Theme (built-in)

- `next-themes` with `attribute="class"`, `defaultTheme="light"`, `enableSystem`. Tailwind uses semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, `border-input`, etc.) that swap via CSS variables in `src/styles/globals.css`. **Never hardcode colors** (`bg-white`, `#fff`, `text-gray-*`).
- Project-specific tokens (`--priority-p0..p3`, `--status-todo/in-progress/done/archived`) live in the same `globals.css`.
- Ready-made control: `<ThemeToggle />` in `@/components`.

## i18n

v1 只中文（zh-CN）。**移除 next-intl** 及所有 `useTranslations()` 调用；用户可见文案直接内联。未来若需要英文再重新引入。

## Component Layers

- **L1** (`src/components/ui/`): shadcn/ui atoms. 从不直接改。
- **L2** (`src/features/_shared/`): 项目级共享原语。复用，不重复实现。
- **L3** (`src/features/<domain>/`): 业务功能模块。

## API Contract (Single Source of Truth)

所有端点写在 `.loop/api-contracts.json`，必须通过 `api-contracts.schema.json` 校验。

响应信封（**所有** `/api/*` 强制统一）：

```ts
{ status_code: 0, data: T, message?: string }        // success
{ status_code: <非0>, data: null, message: string }  // error
```

Helpers 在 `src/lib/api-response.ts`（前端类型）和 `api/lib/response.ts`（Worker 侧 `ok()` / `err()`）。前端 `request<T>()` 消费信封自动抛错。

## Commands

```bash
npm run dev              # Vite 前端 dev server (:5173)
npm run worker:dev       # wrangler dev Worker (:8787)  ← 需并行开另一终端
npm run build            # tsc build + Vite production build → dist/
npm run preview          # 预览 dist/
npm run worker:deploy    # wrangler deploy 到 Cloudflare
npm run db:local:init    # 应用 migrations 到本地 D1
npm run db:local:seed    # 灌入 seed 数据
npm run typecheck        # 前端 tsc + Worker tsc 双检
npm run lint / format
npm run storybook        # Storybook + visual-feedback :6006/:6007
npm run test             # Vitest unit + integration
npm run test:e2e         # Playwright e2e
```

前端 dev 时 `/api/*` 请求会被 vite proxy 转发到 `http://127.0.0.1:8787`。

## Dev Loop

默认三阶段：`proto → dev → deploy`。PRD、review、test 是可选 add-on。

```bash
/dev-loop <requirement>        # 完整流水线
/dev-loop --resume             # 中断后恢复
/dev-prd / /dev-review / /dev-test  # 独立 skill
```
