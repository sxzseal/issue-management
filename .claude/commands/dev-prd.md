---
description: 单独运行 PRD 阶段：调研 + 3 视角合成 + 跨 session 打磨。可独立 session 调用，不依赖 /dev-loop。
---

# /dev-prd — 独立 PRD 阶段

你现在被显式要求**单独执行 PRD 阶段**（Phase 1），不进入 `/dev-loop` 全流程。

## 输入

```
/dev-prd [需求描述]
```

- `$ARGUMENTS` — 可为空（走 --resume 逻辑读 `.loop/prd/state.json`），也可包含新需求描述

## 前置条件

**冷启动 OK** — PRD 阶段可以在完全空的项目里跑（会自动 bootstrap `.loop/`）。

## 上下文约定（重要 — 独立运行场景）

可能场景：

1. **冷启动**：项目刚 create，还没有任何 `.loop/` 状态，用户直接跑 `/dev-prd 做一个 xxx`
2. **打磨接力**：上一个 session 生成了初版 PRD，今天回来继续打磨（`.loop/prd/state.json.status !== "done"`）
3. **重新出**：`.loop/prd.md` 已定稿但用户想推倒重来（用 `AskUserQuestion` 确认）
4. **无 loop 的应急**：`.loop/` 存在但 `session.json` 缺失（老项目 / 手工清理过）

在任何场景下都必须遵守 [PHASE_CONTRACT.md](../PHASE_CONTRACT.md) 的输入/输出契约。

## 行为

**完全委托给 `dev-prd` skill 执行**，不要自己实现调研和合成逻辑。

调用前的预检（**必做**）：

1. 检查 `.loop/prd/state.json`（跨 session resume 主入口）：
   - 存在且 `status !== "done"` 且 `userConfirmedDone === false` → 用 `AskUserQuestion` 提示「检测到未定稿的 PRD（当前 status: `<status>`，已打磨 `<N>` 轮），从断点续跑？」
   - 存在且 `status === "done"` → 提示「上次 PRD 已定稿，重新进入会覆盖现有 PRD，是否继续？」用 `AskUserQuestion` 让用户选择「重新出 PRD / 只打磨现有 PRD / 中断」
   - 不存在 → 冷启动，走 dev-prd 完整流程
2. 检查 `.loop/session.json`：
   - `currentPhase === "prototype" | "dev"` 且相应 phase 未完成 → 提示用户「已经在后续阶段，重新做 PRD 会让原型/开发产物失效，是否继续？」用 `AskUserQuestion` 明确确认
   - 不存在 → 冷启动，dev-prd skill 会 bootstrap
3. 检查 forge-state CLI 可用：`node scripts/lib/forge-state.mjs --install-deps` 应输出 `deps OK`（首次运行会自动装 ajv）

预检通过后调用：

```
Skill(skill="dev-prd", args="<原始 $ARGUMENTS>")
```

## 离开后

dev-prd skill 会写入：

- `.loop/prd.md`（合成后的 PRD）
- `.loop/api-contracts.json`（API 契约 seed，dev-proto 有权覆盖）
- `.loop/prd/research-brief.md`（调研简报）
- `.loop/prd/scope-confirmed.md`（用户敲定的范围）
- `.loop/prd/drafts/*.md`（3 视角草稿）
- `.loop/prd/subagent-receipts/*.json`（每个 subagent receipt）
- `.loop/prd/synthesis-log.md`（合成来源 + 冲突裁决）
- `.loop/prd/state.json`（打磨状态，schema 校验）
- `.loop/session.json`（用户定稿时 `currentPhase: "prototype"` + `phases.prd.status: "completed"`）— 通过 `forge-state update --schema session` 写入

独立运行场景下**不自动进入 dev-proto**，只输出：

```
✅ PRD 已定稿
   打磨轮次 <N> | API 契约 seed 已生成
   PRD：.loop/prd.md
   下一步可选：
   - 原型：/dev-proto
   - 跑完整管线：/dev-loop --resume
```

若用户没有明确定稿（还在 status: "polishing"）：

```
🔄 PRD 打磨中
   当前 status: <status> | 打磨轮次 <N>
   下一步：
   - 继续打磨：再次 /dev-prd 或 /dev-prd --resume
   - 中断：session 已保存，随时可回
```

---

详细的状态契约见 [PHASE_CONTRACT.md](../PHASE_CONTRACT.md)。
