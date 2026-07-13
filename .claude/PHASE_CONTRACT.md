# Phase Contract — 三阶段对齐文档

> 三个主管线阶段（`/dev-prd` / `/dev-proto` / `/dev-dev`）+ 三个独立 skill（`/dev-deploy` / `/dev-review` / `/dev-test`）之间通过 `.loop/` 目录传递状态。
> 任何 skill / command 修改 `.loop/` 都必须遵守本文档的契约，否则会破坏跨 session 的可恢复性。

---

## 1. 设计目标

让 PRD / 原型 / 开发三个主管线阶段**完全解耦**：

- 任何一个阶段都可以在独立 session 中单独运行
- 阶段之间只通过 `.loop/` 目录中的**文件**通信，不依赖内存状态
- 用户可以今天跑 `/dev-prd` 打磨 PRD，明天换电脑/换 session 继续 `/dev-prd --resume`，再下一天跑 `/dev-proto` 和 `/dev-dev`
- 也可以全程在一个 session 内用 `/dev-loop` 串起来
- **部署不在主管线内**：`/dev-deploy` 是独立 skill（跟 `/dev-review`、`/dev-test` 同类），按需调用

**核心原则**：任何 phase 进入时**只看 `.loop/`**，离开时**只写 `.loop/`**，不依赖前一个 phase 的内存上下文。

---

## 2. `.loop/` 目录结构

```
.loop/
├── session.json                       # ★ 派生视图（快速查询），真源在 events.jsonl
├── events.jsonl                       # ★ append-only 事件日志（真源）
├── events-archive/                    # /dev-undo rollback 归档
│
├── prd.md                             # ★ /dev-prd 合成产物（下游 dev-proto 消费）
├── api-contracts.json                 # 由 /dev-prd (seed) 或 /dev-proto 生成，跨阶段共享的 API 契约
├── acceptance-checklist.md            # 由 /dev-proto 生成，dev-dev 的主输入
│
├── prd/                                # ★ /dev-prd 主管线 Phase 1 产物（打磨状态跨 session 接力）
│   ├── state.json                      # ★ 打磨状态（schema: prd-state），--resume 主入口
│   ├── research-brief.md               # Step 1.5 GitHub + Web 调研简报（主 skill 独占）
│   ├── scope-confirmed.md              # Step 1.6 用户敲定的核心/次要/不做清单（主 skill 独占）
│   ├── drafts/                         # 3 视角 subagent 独占产物
│   │   ├── user-value.md
│   │   ├── business-loop.md
│   │   └── tech-feasible.md
│   ├── subagent-receipts/<id>.json     # ★ 每个 prd-<view> subagent 的 receipt（含打磨轮次重跑）
│   └── synthesis-log.md                # 主 skill 独占：合成来源 + 冲突裁决日志
│
├── annotations/                       # /dev-proto 标注循环未处理队列
│   └── <ts>.json
├── annotations-archive/<ts>/          # /dev-proto 已处理标注归档
│
├── prototype/
│   ├── stories-manifest.md            # /dev-proto 输出，列出生成的 stories
│   ├── enhancers-manifest.md          # 本轮启用的 proto enhancers
│   └── subagent-receipts/<id>.json    # ★ Step 2.5 fan-out 每个 proto-feature-builder 的 receipt
│
├── dev/
│   ├── plan.json                      # ★ dev-dev Plan 模式产物（Act 模式合同）
│   ├── task-breakdown.md              # 任务拆解人类可读版
│   ├── component-map.md               # story → feature 映射
│   ├── api-contracts.md               # 人类可读的 API 文档
│   ├── acceptance-coverage.md         # 每条 AC → 实现位置
│   ├── repo-map.txt                   # ★ forge-repomap 产出的符号地图（subagent context）
│   ├── enhancers-manifest.md
│   ├── subagent-receipts/<id>.json    # ★ 每个 subagent 的结构化 receipt
│   ├── pending-patches/<id>-<n>.patch # ★ SEARCH-REPLACE 待应用补丁
│   └── rejected-patches/              # 应用失败被丢弃的补丁
│
├── phases/                            # ★ 每 phase 完成时聚合 metrics
│   ├── prd/metrics.json
│   ├── prototype/metrics.json
│   └── dev/metrics.json
├── loop-summary.json                  # ★ 全 loop rollup（主管线 dev 完成时生成）
│
├── review/findings.md                 # /dev-review 输出（独立 skill，可选）
├── test/coverage-report.md            # /dev-test 输出（独立 skill，可选）
│
├── deploy/                            # /dev-deploy 独立 skill 产物（非主管线）
│   ├── checklist.md                   # 部署报告
│   ├── enhancers-manifest.md          # 本轮启用的 deploy provider
│   └── smoke-result.json              # ★ 部署后 Playwright 冒烟结果
│
├── .worktrees/<subagent-id>/          # ★ dev-dev subagent 沙箱（临时；merge 或 drop 后清理）
│                                      #   注意：dev-proto 的 proto-feature-builder 不使用 worktree
│
└── archive/                           # 完成的 Loop 归档
    └── YYYY-MM-DD-<feature>/
```

---

## 3. session.json — 单一事实源

`.loop/session.json` 是阶段恢复的唯一入口。**每个 phase 完成时必须更新它**。

### Schema

```jsonc
{
  "loopId": "loop-YYYYMMDD-NNN",        // 创建时生成，不变
  "requirement": "<最初需求描述>",       // /dev-prd 或 /dev-proto 创建时写入
  "currentPhase": "prd" | "prototype" | "dev" | "done",

  // 每个主管线阶段的状态独立追踪
  "phases": {
    "prd": {
      "status": "pending" | "in_progress" | "completed",
      "startedAt": "<ISO>",
      "completedAt": "<ISO>",
      "feedbackRounds": 0,                // ★ 打磨轮次 = state.json.iterations.length
      "enhancers": [],                   // ★ 本轮启用的 .claude/enhancers/prd/*.md 的 name 列表
      "parallelWidth": 3
    },
    "prototype": {
      "status": "pending" | "in_progress" | "completed",
      "startedAt": "<ISO>",
      "completedAt": "<ISO>",
      "feedbackRounds": 0,
      "enhancers": [],                   // ★ 本轮启用的 .claude/enhancers/proto/*.md 的 name 列表
      "parallelWidth": 3                 // ★ 本轮 Step 2.5 fan-out 平均并行宽度（0 = 未并行/降级）
    },
    "dev": {
      "status": "pending" | "in_progress" | "completed",
      "startedAt": "<ISO>",
      "completedAt": "<ISO>",
      "enhancers": [],                   // ★ 本轮启用的 .claude/enhancers/dev/*.md 的 name 列表
      "parallelWidth": 3                 // ★ dev-dev Step 2 各 batch 平均并行宽度（0 = 全部串行）
    }
  },

  // 产物文件路径集中登记，便于下游阶段读取
  "artifacts": {
    "prd": ".loop/prd.md",
    "prdState": ".loop/prd/state.json",
    "acceptanceChecklist": ".loop/acceptance-checklist.md",
    "storiesManifest": ".loop/prototype/stories-manifest.md",
    "apiContracts": ".loop/api-contracts.json",
    "taskBreakdown": ".loop/dev/task-breakdown.md",
    "componentMap": ".loop/dev/component-map.md",
    "acceptanceCoverage": ".loop/dev/acceptance-coverage.md",
    "deployReport": ".loop/deploy/checklist.md"
  },

  // 独立 skill 留痕（不写 currentPhase，避免覆写主管线状态）
  "lastPrd": "<ISO>",                    // 兼容字段：dev-prd 也会更新（主管线所有者），独立触发时的时间戳
  "lastDeploy": "<ISO>",                 // /dev-deploy 独立 skill 写入
  "lastReview": "<ISO>",
  "lastTest": "<ISO>",
  "schemaVersion": 2                     // v2 加入 phases.prd，去掉 phases.deploy
}
```

### 写入规则

| 谁写 | 写什么 | 不写什么 |
|------|--------|----------|
| `/dev-prd` (skill, 用户定稿) | `currentPhase = "prototype"`, `phases.prd`, `lastPrd`, 产物路径 | 不动 `phases.prototype` / `phases.dev` |
| `/dev-prd` (skill, 未定稿) | `phases.prd.status = "in_progress"`, `lastPrd` | 不动 `currentPhase`（保持 `"prd"`） |
| `/dev-proto` (skill) | `currentPhase = "dev"`, `phases.prototype`, 产物路径 | 不动 `phases.prd` 已完成字段 / `phases.dev` |
| `/dev-dev` (skill) | `currentPhase = "done"`, `phases.dev`, 产物路径 | 不动 `phases.prd` / `phases.prototype` 已完成字段 |
| `/dev-deploy` (独立 skill) | `lastDeploy` 时间戳 + `artifacts.deployReport` | **绝不**动 `currentPhase` / `phases.*` |
| `/dev-review` (独立 skill) | `lastReview` 时间戳 | **绝不**动 `currentPhase` |
| `/dev-test` (独立 skill) | `lastTest` 时间戳 | **绝不**动 `currentPhase` |

---

## 4. 阶段输入 / 输出契约

### `/dev-proto`

| 维度 | 内容 |
|------|------|
## 4. 阶段输入 / 输出契约

### `/dev-prd`（主管线 Phase 1）

| 维度 | 内容 |
|------|------|
| **必需输入** | 用户需求（自然语言，来自 `$ARGUMENTS`） |
| **可选输入** | `.loop/prd/state.json`（`--resume` 场景：恢复之前的打磨状态） |
| **调研** | 主 skill 用 `gh search` + `WebSearch` 出 `.loop/prd/research-brief.md`（Step 1.5），失败时降级 |
| **用户确认** | Step 1.6 通过 `AskUserQuestion` 敲定核心/次要/不做清单 → `.loop/prd/scope-confirmed.md` |
| **并行 fan-out** | 3 个 subagent（`prd-user-value` / `prd-business-loop` / `prd-tech-feasible`）在同一 assistant 消息里派发，各自写 `.loop/prd/drafts/<view>.md` |
| **合成** | 主 skill 独占写 `.loop/prd.md` + `.loop/prd/synthesis-log.md` |
| **打磨循环 (Step 5.5)** | 主 skill 展示 PRD 摘要 → `AskUserQuestion` 5 选（定稿/局部改/换视角重跑/全部重跑/中断保存）→ 循环直到 `userConfirmedDone === true` |
| **必需输出** | `.loop/prd.md`、`.loop/api-contracts.json`（seed，dev-proto 有权覆盖）、`.loop/prd/state.json`（打磨状态，schema `prd-state`）、`.loop/prd/**` |
| **session.json 写入（定稿）** | `currentPhase = "prototype"`，`phases.prd.status = "completed"`，`lastPrd`，`artifacts.{prd, apiContracts, prdState, researchBrief, scopeConfirmed, prdSynthesisLog}` |
| **session.json 写入（未定稿）** | `phases.prd.status = "in_progress"`，`lastPrd`；**不动** `currentPhase` |
| **fan-out 规则** | 不使用 worktree；主 skill 通过 allow-list（每个 subagent 只能写自己的 draft + receipt）+ receipt/git-diff 双源快照校验保证隔离 |
| **前置检查** | 无强制（自带创建 session.json 的能力） |
| **后置提示（定稿）** | 「下一步可选：/dev-proto / /dev-loop --resume」 |
| **后置提示（中断）** | 「PRD 打磨中，下次跑 /dev-prd --resume 或 /dev-loop --resume 继续」 |

### `/dev-proto`

| 维度 | 内容 |
|------|------|
| **主输入** | `.loop/prd.md`（除非 `--skip-prd`）；用户需求 `$ARGUMENTS` 作为补充说明 |
| **逃生路径** | `--skip-prd`：以 `$ARGUMENTS` 自然语言为主输入，走 4 维度澄清 |
| **必需输出** | `.loop/acceptance-checklist.md`、`.loop/prototype/stories-manifest.md`、`.loop/api-contracts.json`、`src/stories/<project>/*.stories.tsx` |
| **session.json 写入** | `currentPhase = "dev"`，`phases.prototype.status = "completed"` |
| **前置检查** | 若 `currentPhase === "prd"` 且未 completed 且未 `--skip-prd` → AskUserQuestion 提示补跑 PRD |
| **后置提示** | 「下一步可选：/dev-dev / /dev-review / /dev-test / /dev-loop --resume」 |

### `/dev-dev`

| 维度 | 内容 |
|------|------|
| **必需输入**（至少一项） | `.loop/acceptance-checklist.md` ★主验收输入<br>`.loop/prototype/stories-manifest.md`<br>`.loop/prd.md` ★推荐（需求真源，消歧依据） |
| **强制只读** | `.loop/api-contracts.json` — API 字段以此为准，开发阶段不偷改 |
| **必需输出** | `.loop/dev/task-breakdown.md`、`.loop/dev/component-map.md`、`.loop/dev/api-contracts.md`、`.loop/dev/acceptance-coverage.md`、`src/features/...` 实际代码 + git commit |
| **session.json 写入** | `currentPhase = "done"`，`phases.dev.status = "completed"` |
| **前置检查** | 三份输入都不存在 → 报错，引导用户跑 `/dev-loop` 或 `/dev-prd` |
| **后置提示** | 「主管线走完。下一步可选：/dev-deploy / /dev-review / /dev-test」 |

### `/dev-deploy`（独立 skill，非主管线）

| 维度 | 内容 |
|------|------|
| **必需输入** | 代码可编译（`npm run build` 通过）、git 干净、CLI 已登录 |
| **可选输入** | `.loop/api-contracts.json`、`.loop/dev/acceptance-coverage.md`、`.loop/review/findings.md` |
| **必需输出** | `.loop/deploy/checklist.md`，实际 Vercel / Railway 部署 |
| **session.json 写入** | `lastDeploy` 时间戳 + `artifacts.deployReport`；**绝不**动 `currentPhase` / `phases.*` |
| **前置检查** | 构建失败直接终止；其他软前置缺失只警告 |
| **后置提示** | 「归档 Loop / 开始新 Loop」 |

---

## 5. 独立运行场景手册

### 场景 A：冷启动（`.loop/` 不存在）

| 命令 | 行为 |
|------|------|
| `/dev-prd <需求>` | ✅ 正常创建 `.loop/` 和 session.json，进入 PRD 阶段 |
| `/dev-proto <需求>` | ✅ 冷启动 + `--skip-prd` 语义生效（无 PRD 走自然语言） |
| `/dev-dev` | ❌ 报错，引导用户先跑 `/dev-loop` 或 `/dev-prd` |
| `/dev-deploy` | ⚠️ 警告但允许（冷启动部署是合法路径） |

### 场景 B：PRD 打磨跨 session（新场景，主要驱动力）

```bash
# Session 1
/dev-prd 番茄钟应用
# → 生成 .loop/prd.md + state.json（status: polishing），关闭 session 打磨到一半

# Session 2 (第二天)
/dev-prd --resume
# → 检测到 state.json.status === "polishing" 且 userConfirmedDone === false
# → 直接进入 Step 5.5 打磨循环，展示当前 PRD 摘要 + iterations 历史

# Session 3
# 用户在打磨循环里选"定稿" → phases.prd.status = "completed", currentPhase = "prototype"
```

### 场景 C：PRD → 原型接力

```bash
# Session 1
/dev-prd 用户管理系统
# → 用户定稿 PRD

# Session 2 (几天后，换台电脑也行)
/dev-proto
# → 自动读取 .loop/prd.md 作为主输入，跳过澄清直接生成 stories
```

### 场景 D：原型迭代未完，回来继续标注

```bash
# Session 1
/dev-proto --skip-prd 加个登录
# → 用户标注了几个点，关掉 session 没处理完

# Session 2
/dev-proto --resume
# → 检测到 .loop/annotations/ 有未处理标注，直接进入迭代循环
```

### 场景 E：开发完成、单独跑审查再部署

```bash
/dev-dev          # Session 1，主管线到 done
/dev-review       # Session 2，写入 .loop/review/findings.md
/dev-test         # Session 3，写入 .loop/test/coverage-report.md
/dev-deploy       # Session 4，读取上面两份做软前置检查
```

### 场景 F：回炉重做 PRD

```bash
# 已经跑到 /dev-dev 了，发现需求要改
/dev-prd <修改后的需求>
# → 检测到 currentPhase === "dev" 且 phases.prd.status === "completed"
# → AskUserQuestion 确认：重新做 PRD 会让下游产物失效
# → 用户确认后，重写 .loop/prd.md 等
# → /dev-proto / /dev-dev 需要被重新跑
```

---

## 6. 红线

1. **`currentPhase` 只由 dev-prd / dev-proto / dev-dev 写入** — 独立 skill（deploy / review / test）一律不动
2. **`.loop/*.json` 写入必须经过 `forge-state` CLI** — `node scripts/lib/forge-state.mjs write|update|set ... --schema <name>`。禁止直接用 Write 编辑 session.json / task-state.json / api-contracts.json / prd/state.json。CLI 自带 atomic write（temp + rename）、文件锁（30s 陈旧自动清理）和 JSON Schema 校验，校验不通过会拒绝写入，原文件不变
3. **每个阶段进入时只读 `.loop/`** — 不依赖任何内存上下文，不读 git log / 历史 PR
4. **每个阶段离开时必须更新 session.json** — 否则下一个阶段无法判断状态
5. **跨阶段共享的契约文件不允许下游修改** — 例如 `.loop/api-contracts.json` 由 dev-prd（seed）或 dev-proto 拥有，dev-dev 只读；`.loop/prd.md` 由 dev-prd 拥有，dev-proto / dev-dev 只读
6. **PRD 定稿是推进 currentPhase 的唯一触发** — dev-prd Step 5.5 打磨循环里用户明确"定稿"才写 `currentPhase = "prototype"` + `phases.prd.status = "completed"`；否则保持 `in_progress`，下次 `--resume` 直接回到循环
7. **回炉重做要明确告知用户产物失效** — 用 `AskUserQuestion` 确认，不静默覆盖
8. **冷启动部署需警告** — 没跑过主管线直接部署，写一行警告到 `.loop/deploy/checklist.md`
9. **增强能力包采用两段式加载** — 三个主 skill Step 0 先用 `node scripts/lib/enhancers.mjs list <phase>` 只扫描 frontmatter，按需求关键词配合 `appliesTo` 过滤后再 Read 选中的；启用清单通过 `enhancers manifest` 落盘到 `.loop/<phase>/enhancers-manifest.md` 并写入 `session.json.phases.<phase>.enhancers`
10. **`.loop/events.jsonl` append-only** — 每个 phase 进出、每个 step 边界、每次 subagent 派发、AskUserQuestion、checkpoint、self-check 结果都必须写 event。不允许覆盖或删除历史 event（回滚走 `forge-events rollback` 归档到 `events-archive/`）
11. **subagent 必须落 receipt** — 每个主管线 subagent 完成时必须写 `.loop/<phase>/subagent-receipts/<id>.json`（schema：`subagent-receipt`，`phase` 枚举 `prd|prototype|dev|deploy`）；主 skill 未收到有效 receipt 即视为失败并触发重试

    | phase | receipt 目录 |
    |------|-----|
    | prd | `.loop/prd/subagent-receipts/prd-<view>.json`（打磨重跑加 `-r<N>`） |
    | prototype | `.loop/prototype/subagent-receipts/<id>.json` |
    | dev | `.loop/dev/subagent-receipts/<id>.json` |
12. **主管线 phase 走 forge-budget** — dev-prd / dev-proto / dev-dev 由 `node scripts/lib/forge-budget.mjs check <phase>` 强制；触顶必须 AskUserQuestion 而非死循环。默认预算：`prd(30 steps / 8 subagents / 1 retry)`、`proto(50/5/0)`、`dev(100/30/3 retries per checkpoint)`
    - 说明 A（prd）：`8 subagents` = 3 首轮 + 5 次 targeted retry 或换视角重跑；`全串行 fallback` 消耗 0 subagent（主 skill 亲写）
    - 说明 B（dev）：`retries per checkpoint` 是 dev-dev 每个 checkpoint 独立算的重试预算，不共享
12a. **独立 skill 各自在 SKILL.md 内定义硬上限** — `/dev-deploy` / `/dev-review` / `/dev-test` 不消费 `session.phases.<phase>.*` 预算，各自在自己 skill 里落硬上限（deploy 参考默认：30 steps / 5 subagents / 2 retries，read-only）
13. **dev-dev Plan/Act 显式分离** — Step 1 是纯 plan 模式（read-only role plan-analyst），输出 `.loop/dev/plan.json` → AskUserQuestion 批准；Step 2+ 是 act 模式，subagent 只能改 plan.tasks[].filesPlanned 里的文件，多改的进 deviations
14. **subagent worktree 规则分阶段** — **dev-dev** Step 2 每个派发前 `forge-worktree create --subagent <id>`，subagent 完成后主 skill validate patches + receipt，通过 → `forge-worktree merge`，失败 → `forge-worktree drop`。**dev-proto** Step 2.5 并行派发的 `proto-feature-builder` **不使用 worktree**；**dev-prd** 的 3 视角 subagent 也不使用 worktree —— 通过 allow-list（receipt + git-diff 双源快照）校验保证隔离，任何越界即失败（详见 dev-prd SKILL Step 2.5.2）
15. **checkpoint commit 必须打 git tag** — 格式 `loop-<loopId>-cp-<n>`，同时写 `checkpoint.created` event + append 到 `session.json.checkpoints[]`。`/dev-undo` 消费这份记录
16. **审批 mode 由 forge-mode gate 拦截** — session.json.mode 决定 hook 行为（suggest/auto-edit/full-auto）；prod 部署 / 强制 push / `rm -rf` 等一律 ask，无论 mode
17. **dev-proto 并行 fan-out 由主 skill 独占 barrel/manifest** — Step 2.5 gather 阶段，`mocks/handlers/index.ts`、`.loop/prototype/stories-manifest.md`、`.loop/api-contracts.json` 均由主 skill 写入，subagent 触碰任一即失败
18. **plan-analyst 拆解粒度以 (feature × layer) 为一格** — dev-dev Step 1 产出的 `.loop/dev/plan.json` 里，同一 feature 的不同 layer（infra/api/feature-lib/views）必须拆成独立 task，`tasks[].dependencies` 只声明真正的文件级依赖，不写保守的"按顺序"依赖。目标并行宽度 ≥ 3；若拆完仍 < 3，plan-analyst 把最大 task 再细分。dev-dev Step 2 从 dependencies 拓扑分组算 batches。

---

## 7. 三种入口对比

| 入口 | 何时用 | 完成后行为 |
|------|--------|-----------|
| `/dev-loop <需求>` | 一口气走完整管线，过程中可用 AskUserQuestion 在 phase 间确认 | 自动询问进入下一阶段 |
| `/dev-proto` / `/dev-dev` / `/dev-deploy` | 单独执行某一阶段，跨 session 接力 | 只提示用户「下一步可选 X」，不自动进入 |
| `/dev-prd` / `/dev-review` / `/dev-test` | 增强 skill，按需手动调用 | 不影响主管线 `currentPhase` |

---

## 8. 给 skill 作者的实现指引

如果你在改 `dev-proto` / `dev-dev` / `dev-deploy` skill：

1. **Step 0 检查 `.loop/`** — 完整列出本 phase 需要的输入文件，缺失就报错或降级
2. **Step 0 必须扫描并加载 `.claude/enhancers/<phase>/*.md`**（`_` 开头占位除外）— 后续步骤生成产物前要回顾启用的增强规范；dev-dev 派发 subagent 时要把 enhancer 内容整段拷贝到 subagent prompt
3. **不要假设 session 内 context** — 例如不要假设「上一步 AI 还记得用户说过 X」，全部从 `.loop/` 读
4. **写 session.json 用 read → modify → write 模式** — 不要覆盖整个文件，保留其他 phase 的字段
5. **产物文件路径写到 `artifacts`** — 让下游 phase 通过 session.json 找到，不要硬编码路径
6. **完成时写入 `phases.<phase>.enhancers`** — 列出本轮启用的增强 skill `name`（来自 Step 0 扫描结果）
7. **完成时写入 `phases.<phase>.parallelWidth`** — 记录本轮实际并行宽度（proto Step 2.5 / dev Step 2 batches 平均）。降级为串行时写 0。

如果你在加新的独立 skill（类似 `/dev-prd`）：

- 只写自己的字段（`lastFoo`、`artifacts.foo`）
- **绝不**动 `currentPhase` / `phases.*` / 别的独立 skill 的 `lastBar`

---

## 9. 调试 / 排错

| 现象 | 可能原因 | 处理 |
|------|---------|------|
| `/dev-dev` 报「找不到验收清单」 | 没跑过 `/dev-proto` 或 `.loop/` 被清空 | 跑 `/dev-proto` 或手动补 `.loop/acceptance-checklist.md` |
| `/dev-loop --resume` 跳到错误阶段 | `session.json.currentPhase` 被独立 skill 误写 | 手动修正 session.json，或重新跑对应阶段 |
| 两个 session 同时改 `.loop/` 冲突 | 并发使用 | 不支持并发，建议同时只跑一个阶段 |
| 部署后 `.loop/deploy/checklist.md` 但 `currentPhase` 还是 `"dev"` | dev-deploy skill 写入失败 | 检查 skill 是否完成 Step 6（更新 session.json） |
| subagent 完成但没有 receipt | subagent prompt 未包含 receipt 要求 或 subagent 崩溃 | 主 skill 视为 subagent.failed，触发 D1 重试逻辑；查 `.loop/events.jsonl` 定位失败原因 |
| budget.exceeded 后 skill 死循环 | budget CLI 未被主 skill 调用 | 检查 skill Step 是否插入 `forge-budget check <phase>`；exit code 2 应触发 AskUserQuestion |
| `--resume` 卡在错误 step | events.jsonl 缺 step.exit 事件 | `forge-events resume-hint` 找出 in-flight step，若不对可手动 append step.exit event |
| dev-proto Step 2.5 fan-out subagent 触碰了 blocklist 文件 | 主 skill gather disjoint-set 校验捕获 | 记 `subagent.failed`，串行重跑该 feature（或降级到 Step 3+4 单线程） |

---

## 10. Harness 工具速查

所有工具都在 `scripts/lib/` 下，通过 `node scripts/lib/<name>.mjs` 调用。

| 工具 | 用途 | 主要子命令 |
|---|---|---|
| `forge-state` | `.loop/*.json` atomic + schema 校验 | read / write / update / set / validate / lock |
| `forge-events` | `events.jsonl` 事件日志 | append / tail / query / rollup / rollback / resume-hint |
| `forge-budget` | phase step/subagent/retry 预算 | check / consume / set / reset |
| `forge-patch` | Aider SEARCH-REPLACE 补丁 | parse / validate / apply / reject |
| `forge-worktree` | subagent git worktree 沙箱（仅 dev-dev） | create / list / path / merge / drop |
| `forge-repomap` | 生成仓库符号地图（subagent context） | build / show |
| `forge-metrics` | 从 events.jsonl 计算 phase 指标 | compute / show / rollup |
| `forge-mode` | 三档审批（hooks 调用） | get / set / gate / classify |
| `enhancers` | 两段式增强 skill 加载 | list / select / manifest |

**Schema 位置**：`.claude/schemas/`（session / api-contracts / task-state / event / subagent-receipt / plan / subagent-role / phase-metrics）
**Role 定义**：`.claude/roles/`（feature-impl / api-route / shared-primitive / page-integration / plan-analyst / proto-feature-builder）
**Hooks**：`.claude/settings.json` PostToolUse（session.json 写入校验）+ PreToolUse（Bash 高危拦截 gate）
