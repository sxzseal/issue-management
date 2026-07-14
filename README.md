# issue-management

单人个人产品 · 轻量 Issue / Project 管理,部署在 Cloudflare 边缘。

## 技术栈

- **前端**:Vite 6 + React 19 + React Router 7 + TypeScript 5.7 (strict)
- **UI**:shadcn/ui + Tailwind CSS 3 + next-themes(light/dark)
- **数据**:TanStack Query v5 / Form / Table
- **后端**:Hono 4 on Cloudflare Workers(`api/index.ts`)
- **存储**:Cloudflare D1(SQLite) + R2(issue body 溢出) + KV(JWT 黑名单 + rate limit)
- **测试**:Vitest(unit / integration) + Playwright(e2e)
- **原型**:Storybook 10 + MSW 2

## 快速开始

```bash
npm install

# 本地密钥(不提交)
cp .dev.vars.example .dev.vars   # 或手动创建
# .dev.vars 内容:
#   APP_PASSWORD  = "<你的登录口令>"
#   JWT_SECRET    = "<32+ 字节随机串>"
#   WEBHOOK_SECRET = "<webhook 签名密钥>"

# 初始化本地 D1(SQLite)
npm run db:local:init
npm run db:local:seed

# 双终端启动
npm run worker:dev    # Worker  → http://127.0.0.1:8787
npm run dev           # 前端    → http://localhost:5173
```

前端 dev 时 `/api/*` 会通过 Vite proxy 转发到 Worker。

## 常用命令

```bash
npm run build           # tsc + Vite production build → dist/
npm run typecheck       # 前端 + Worker 双 tsc
npm run lint / format
npm run test            # Vitest
npm run test:e2e        # Playwright
npm run storybook       # Storybook :6006
```

## 部署到 Cloudflare

1. **登录 wrangler**
   ```bash
   npx wrangler login
   ```

2. **创建资源(首次)**
   ```bash
   npx wrangler d1 create issue_management
   npx wrangler r2 bucket create issue-attachments
   npx wrangler kv namespace create issue_kv
   ```
   把返回的 `database_id` / KV `id` 填回 [wrangler.toml](wrangler.toml)。

3. **应用远程 migrations**
   ```bash
   npx wrangler d1 migrations apply issue_management --remote
   ```

4. **注入生产密钥**(不要写进 `wrangler.toml`)
   ```bash
   npx wrangler secret put APP_PASSWORD
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put WEBHOOK_SECRET
   ```

5. **构建 + 发布**
   ```bash
   npm run build
   npm run worker:deploy
   ```

## 目录结构

```
src/
  main.tsx / App.tsx           React 挂载与顶层
  components/ui/               L1: shadcn/ui atoms(勿改)
  features/_shared/            L2: 项目级共享原语(state/form)
  features/<domain>/           L3: 业务功能(queries/mutations/views)
  routes/                      React Router route 组件
  lib/                         request / api-response / validators
api/
  index.ts                     Hono app + middleware
  routes/                      auth / projects / labels / issues / comments / webhook
  lib/                         jwt / auth / db / r2-body / pagination
  middleware/                  auth-guard / cors / error-handler / envelope
migrations/                    D1 SQL migrations
mocks/                         MSW handlers(仅 Storybook 用)
```

## API 契约

所有 `/api/*` 响应统一信封:

```ts
{ status_code: 0, data: T, message?: string }        // success
{ status_code: <非0>, data: null, message: string }  // error
```

前端 `request<T>()`([src/lib/request.ts](src/lib/request.ts))消费信封并自动抛错。

## 安全须知

- [.dev.vars](.dev.vars) 与所有 `.env*` 已在 [.gitignore](.gitignore) 中,不进版本库。
- 生产密钥一律用 `wrangler secret put` 注入,不要提交到 [wrangler.toml](wrangler.toml)。
- 默认口令 `admin` 只用于本地开发,部署前务必替换。

## License

MIT
