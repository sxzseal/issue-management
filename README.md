# issue-management

由 [ai-forge](https://github.com/) 脚手架生成 —— AI 驱动的全流程开发框架。

## 技术栈

- **Next.js 15**（App Router）+ React 19 + TypeScript
- **shadcn/ui** + Tailwind CSS + next-themes（明暗主题）
- **next-intl**（i18n）
- **Storybook 10** + MSW 2（原型与接口 mock）
- **Vitest**（单测）+ **Playwright**（E2E / smoke）
- 部署：**Vercel**（前端）+ **Railway**（服务）

## 快速开始

```bash
pnpm dev              # 启动 Next.js 开发服务器（http://localhost:3000）
pnpm storybook        # 启动 Storybook（http://localhost:6006）+ 标注反馈面板
pnpm test             # 运行单元测试
pnpm test:e2e         # 运行 Playwright E2E
pnpm typecheck        # 类型检查
pnpm lint             # ESLint
```

## Dev Loop（AI 驱动的开发流程）

本项目内置 [ai-forge](https://github.com/) 的 Dev Loop skills 与 slash commands。在 Claude Code 中输入：

```
/dev-loop <需求描述>       # 一口气跑完 原型 → 开发 → 部署
/dev-proto <需求描述>      # 只做原型（Storybook + visual feedback）
/dev-dev                   # 只做开发（接续原型产物）
/dev-deploy                # 只做部署（Vercel + Railway）
```

按需增强 skill（不在默认管线中，手动调用）：

```
/dev-prd     # 输出结构化 PRD 文档
/dev-review  # 深度代码审查（安全 / 性能 / PRD 合规）
/dev-test    # 完整测试套件 + 覆盖率报告
```

阶段间的状态与产物通过 `.loop/` 目录持久化，跨 session 接力。契约详见 [.claude/PHASE_CONTRACT.md](./.claude/PHASE_CONTRACT.md)。

## 目录结构

```
src/
  app/[locale]/     # Next.js 路由（含 i18n 分段）
  app/api/          # API 路由
  components/       # shadcn/ui 原子组件（原型与开发共用）
  features/         # 按业务域划分的功能模块
  i18n/             # next-intl 配置
  stories/          # Storybook 故事文件
messages/           # i18n 文案（zh / en …）
mocks/              # MSW handlers
tests/
  smoke/            # 部署后 smoke 测试（dev-deploy 消费）
.claude/
  skills/           # Dev Loop skills（dev-* + frontend-design）
  commands/         # slash commands
  enhancers/        # 阶段增强能力包（proto/dev/deploy）
  schemas/          # session / api-contracts / task-state JSON Schema
.loop/              # AI 开发流程的状态与产物（每个 phase 一个子目录）
```

## API 契约

所有 API 响应遵循统一信封：

```json
{ "status_code": 0, "data": { ... }, "message": "optional" }
```

契约定义见 [.claude/schemas/api-contracts.schema.json](./.claude/schemas/api-contracts.schema.json)。

## 升级框架资产

保留业务代码，仅升级 `.claude/skills` / `commands` / `enhancers` / `schemas` 与 `scripts/lib/`：

```bash
# 从 ai-forge 仓库根目录运行
./scripts/upgrade.sh /path/to/issue-management
```
