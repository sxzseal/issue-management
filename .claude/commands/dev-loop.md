---
description: AI 驱动的全流程开发管线。3 阶段：PRD → 原型 → 开发。用法：/dev-loop <需求> [--from <phase>] [--to <phase>] [--resume] [--skip-prd] [--skip-feedback]
---

# Dev Loop — 全流程开发管线（3 阶段）

你现在是 **Dev Loop 编排器**，负责从需求到可交付代码的完整开发流程。

## 设计哲学

**PRD 驱动 + 原型验证**：

1. 深度调研 + 3 视角合成，产出一份可打磨的 PRD
2. 以 PRD 为主输入生成可交互原型，用户在浏览器里点和标注迭代
3. 以 PRD + 验收清单 + 原型为输入，拆解并行开发

PRD 是主输入，原型是可视化验证，开发是落地。部署不在本管线内 —— 想部署单独跑 `/dev-deploy`。

---

## 输入

```
/dev-loop <需求描述> [--from <phase>] [--to <phase>] [--resume] [--skip-prd] [--skip-feedback]
```

- `$ARGUMENTS` — 用户需求 + 可选参数
- `--from <phase>` — 从指定阶段开始（prd / proto / dev）
- `--to <phase>` — 到指定阶段结束
- `--resume` — 从上次中断处恢复
- `--skip-prd` — 跳过 Phase 1 PRD 阶段，直接用 `$ARGUMENTS` 作为需求进入原型（适合轻量项目 / 需求已足够清晰 / 想快速验证 UI）
- `--skip-feedback` — Phase 2 跳过 visual feedback 标注迭代循环，原型一次生成即定稿

---

## 参数解析

从 `$ARGUMENTS` 提取：

1. **需求描述**：非 flag 的文本部分
2. **--from**：起始阶段名（prd / proto / dev）
3. **--to**：结束阶段名
4. **--resume**：恢复模式
5. **--skip-prd**：传递给整个管线，跳过 Phase 1
6. **--skip-feedback**：传递给 dev-proto，跳过标注循环

如果 `--resume`，读取 `.loop/session.json`，恢复上下文。

如果 `--from` 指定了起始阶段：
- 检查该阶段的前置条件是否满足（如 `--from proto` 需要 `.loop/prd.md` 存在，除非同时 `--skip-prd`）
- 不满足则报错并提示需要先执行的阶段

---

## 阶段管线（3 阶段）

```
Phase 1: PRD (prd)          → dev-prd skill（深度调研 + 3 视角合成 + 打磨迭代）
Phase 2: 原型 (proto)       → dev-proto skill（读 PRD 生成 Storybook + visual feedback 循环）
Phase 3: 开发 (dev)         → dev-dev skill（读 PRD + 验收清单 + 原型，lobster-lead 拆解并行）
```

每个 Phase 之间都有 **用户确认门控**。

**独立 skill**（不在默认管线中，用户可单独调用）：

- `/dev-deploy [env]` — 部署到 Vercel + Railway
- `/dev-review` — 深度代码审查（安全 / 性能 / PRD 合规）
- `/dev-test` — 生成完整测试套件 + 覆盖率报告

---

## Phase 1 · PRD

**委托给**：`dev-prd` skill 的完整流程

**核心动作**：

1. Step 0-1 环境检查 + 需求 4 维度澄清（目标 / 范围 / 约束 / 成功指标）
2. Step 1.5 GitHub + Web 调研（相似产品 / 技术方案 / 边界与坑 / 合规）→ `.loop/prd/research-brief.md`
3. Step 1.6 与用户敲定核心 / 次要 / 不做清单 → `.loop/prd/scope-confirmed.md`
4. Step 2 并行派发 3 个 subagent（用户价值 / 商业闭环 / 技术可行）→ `.loop/prd/drafts/*.md`
5. Step 3 合成 → `.loop/prd.md` + `.loop/api-contracts.json`（seed）
6. **Step 5.5 打磨循环**（跨 session 可接力）：
   - 展示当前 PRD 摘要
   - 用户可选：**定稿** / 局部改某章节 / 换视角重跑
   - 局部打磨走增量 subagent 派发，只重跑相关视角
   - 状态记录到 `.loop/prd/state.json`
   - 直到用户明确"定稿"
7. 用户"定稿"后：`currentPhase: "prototype"`

**离开条件**：用户在 Step 5.5 明确定稿，`.loop/prd/state.json.userConfirmedDone === true`。

**确认后输出**：
```
✅ Phase 1 完成：PRD 已定稿
   打磨轮次 <N> | 章节 <N> 个 | API 契约 seed 已生成
   PRD：.loop/prd.md
   → 下一步：原型
```

用 `AskUserQuestion` 询问是否继续。

`--skip-prd` 场景：完全跳过 Phase 1，`session.json.phases.prd.status = "skipped"`，`currentPhase` 直接跳到 `"prototype"`。

---

## Phase 2 · 原型

**委托给**：`dev-proto` skill 的完整流程

**核心动作**：

1. **主输入切换**：如果 `.loop/prd.md` 存在（正常路径），以 PRD 为主输入，`$ARGUMENTS` 只作为补充说明（如"加个夜间模式"）；`--skip-prd` 场景走原有的自然语言 + 4 维度澄清流程
2. 审计 shadcn 组件，安装缺失的
3. 生成 Storybook stories + MSW handlers + fixtures
4. 启动 Storybook（`localhost:6006`）
5. **进入 visual feedback 迭代循环**（除非传入 `--skip-feedback`）：
   - Storybook 自带标注工具（项目模板内置 `_storybook/visual-feedback/`），用户点元素 → 写反馈 → 自动保存到 `.loop/annotations/<ts>.json`
   - AI 读取 `.loop/annotations/` → 迭代 stories / fixtures / theme → 归档已处理标注
   - 重新跑 Storybook 让用户复看 → 直到用户说"定稿"
6. 反推「验收清单」写入 `.loop/acceptance-checklist.md`
7. 写入 `.loop/prototype/stories-manifest.md`
8. 用户确认原型定稿

**离开条件**：用户在 Storybook 中确认原型已定稿，验收清单已生成。

**确认后输出**：
```
✅ Phase 2 完成：原型已定稿
   组件 <N> 个 | Stories <N> 个 | MSW Handlers <N> 个 | 标注迭代轮次 <N>
   验收清单：.loop/acceptance-checklist.md（<N> 条验收项）
   → 下一步：开发
```

用 `AskUserQuestion` 询问是否继续。

---

## Phase 3 · 开发

**委托给**：`dev-dev` skill 的完整流程

**核心动作**：

1. 读取输入：`.loop/prd.md`（需求真源）+ `.loop/acceptance-checklist.md`（验收项）+ `.loop/prototype/stories-manifest.md`（UI 契约）
2. 使用 lobster-lead 四阶段模式拆解任务
3. 并行派发 subagent 开发（数据层、API、前端组件）
4. **每个 checkpoint 前**：跑 `tsc --noEmit` + 轻量自检（命名 / `useEffect` / `any`），通过后调用 `/smart-commit`
5. 输出开发文档到 `.loop/dev/`
6. 用户确认开发完成

**离开条件**：所有任务完成，代码可编译，验收清单中每条都有对应实现。

**确认后输出**：
```
✅ Phase 3 完成：开发完毕
   任务 <N>/<N> | Commits <N> 次 | 验收清单覆盖率 <N>/<M>
   → 主管线完成。下一步可选：
      /dev-deploy   — 部署到 Vercel + Railway
      /dev-review   — 深度代码审查
      /dev-test     — 生成完整测试套件
```

`currentPhase` 写入 `"done"`。

---

## 恢复机制 (--resume)

当使用 `--resume` 时：

1. 读取 `.loop/session.json`
2. 找到 `currentPhase`
3. 总结已完成的工作：

```
📋 Loop 恢复
──────────────────────────────
Loop ID: loop-YYYYMMDD-NNN
需求：<requirement>
当前阶段：<phase>（第 <N>/3 阶段）

已完成：
  ✅ Phase 1: PRD（打磨 <N> 轮）
  🔄 Phase 2: 原型（进行中）

待执行：
  ○ Phase 3: 开发
```

4. 用 `AskUserQuestion` 询问：从当前阶段继续？还是跳到其他阶段？

**PRD 阶段的 --resume 特别处理**：如果 `.loop/prd/state.json.status !== "done"`，直接进入 dev-prd 的 Step 5.5 打磨循环，不重跑调研 / 3 视角。

---

## 红线（不可违反）

1. **每个 Phase 之间必须有用户确认** — 不自动跳过确认
2. **前置条件不满足不能跳阶段** — `--from proto` 需要 `.loop/prd.md` 存在（或同时传 `--skip-prd`）；`--from dev` 需要 `.loop/acceptance-checklist.md` 存在
3. **Phase 1 PRD 必须由用户确认定稿** — 不自动认为"生成完就是定稿"，必须走 Step 5.5 循环直到用户明确说 done
4. **Phase 2 原型必须进入标注迭代循环** — 不一次生成就交付，除非用户明确传入 `--skip-feedback`
5. **Phase 2 必须生成验收清单** — 下游开发依赖
6. **Phase 3 开发必须用 lobster-lead 模式** — 不直接写代码
7. **Phase 3 checkpoint 前必须跑 `tsc --noEmit`** — 类型错误不进 commit
8. **每个 Phase 完成都更新 session.json** — 确保可恢复
9. **涉及 git push / 部署必须用户确认** — 不自动推送到远程
10. **部署不在本管线内** — Phase 3 完成后停止，用户想部署自己跑 `/dev-deploy`

---

## 快速参考

| 命令 | 效果 |
|------|------|
| `/dev-loop 用户管理系统` | 全流程（3 阶段：prd → proto → dev），phase 间用户确认 |
| `/dev-loop 加个登录 --to prd` | 只做 PRD 阶段（含打磨循环） |
| `/dev-loop <需求> --skip-prd` | 跳过 PRD，直接进原型（自然语言驱动） |
| `/dev-loop --from proto` | 从原型开始（需要 `.loop/prd.md` 或 `--skip-prd`） |
| `/dev-loop --resume` | 从上次中断处继续 |
| `/dev-loop 修个 bug --from dev` | 跳过 PRD/原型，直接开发 |
| `/dev-loop 后台管理系统 --skip-feedback` | 全流程但原型一次生成不进标注循环 |
| `/dev-prd <需求>` | **单独运行 PRD 阶段**，支持跨 session 打磨 |
| `/dev-proto <需求>` | **单独运行原型阶段**，跨 session 可接力 |
| `/dev-dev` | **单独运行开发阶段**，读取 `.loop/prd.md` + `.loop/acceptance-checklist.md` |
| `/dev-deploy [env]` | **独立部署命令**，preview/staging/production |
| `/dev-review` | 独立深度代码审查 |
| `/dev-test` | 独立生成测试套件 |

跨 session 独立运行三阶段的完整契约见 [../PHASE_CONTRACT.md](../PHASE_CONTRACT.md)。
