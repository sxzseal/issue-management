---
description: 单独运行原型阶段：从 PRD 或自然语言 → Storybook 可交互原型 + 标注迭代 → 验收清单。可独立 session 调用，不依赖 /dev-loop。
---

# /dev-proto — 独立原型阶段

你现在被显式要求**单独执行原型阶段**（Phase 2），不进入 `/dev-loop` 全流程。

## 输入

```
/dev-proto [需求描述 / 补充说明] [--skip-prd] [--skip-feedback] [--resume]
```

- `$ARGUMENTS` — 用户需求 / 补充说明 + 可选 flag
- `--skip-prd` — 忽略 `.loop/prd.md`（如果存在），以 `$ARGUMENTS` 自然语言为主输入
- `--skip-feedback` — 跳过 visual feedback 标注循环，一次生成定稿
- `--resume` — 检测到 `.loop/annotations/` 还有未处理标注时，直接进入迭代循环而不重新生成

## 主输入优先级

1. **`.loop/prd.md` 存在 且未指定 `--skip-prd`** → **主输入是 PRD**；`$ARGUMENTS` 只作为补充说明（如"加个夜间模式"）
2. **`--skip-prd` 或 `.loop/prd.md` 不存在** → 主输入是 `$ARGUMENTS` 自然语言，走 4 维度澄清（目标/范围/关键场景/视觉风格）

## 上下文约定（重要 — 独立运行场景）

这是**独立 slash command**，可能在以下场景被调用：

1. **PRD → 原型接力**：上个 session 跑完 `/dev-prd`，今天接着生成原型
2. **冷启动 + 跳 PRD**：`.loop/` 空，用户直接跑 `/dev-proto <需求> --skip-prd`
3. **续接**：上次跑完 dev-proto 关掉 session，今天换 session 接着标注迭代
4. **回炉**：已经跑过 dev-dev 了，发现 UI 要改，回来重做原型

在任何场景下都必须遵守 [PHASE_CONTRACT.md](../PHASE_CONTRACT.md) 中定义的**输入产物 / 输出产物 / session.json 写入规则**。

## 行为

**完全委托给 `dev-proto` skill 执行**，不要自己实现原型生成逻辑。直接通过 Skill 工具调用：

```
Skill(skill="dev-proto", args="<原始 $ARGUMENTS>")
```

调用前先做以下检查并报告给用户：

1. `.loop/session.json` 是否存在？
   - 不存在 → 全新流程，直接开始
   - 存在且 `currentPhase === "prd"` 且 `phases.prd.status !== "completed"` → 提示用户：「检测到 PRD 阶段未定稿，建议先跑 `/dev-prd` 完成 PRD，或加 `--skip-prd` 绕过」用 `AskUserQuestion` 让用户选择
   - 存在且 `currentPhase === "dev"` 且 `phases.dev.status !== "completed"` → 提示用户：「检测到开发阶段进行中，重做原型会让 dev 产物失效，是否继续？」用 `AskUserQuestion` 确认
   - 存在且 `currentPhase === "done"` → 提示用户：「主管线已完成，重做原型会让开发产物失效，是否继续？」
2. `.loop/prd.md` 是否存在？
   - 存在且未指定 `--skip-prd` → 报告"检测到 PRD，将以 PRD 为主输入"
   - 不存在或 `--skip-prd` → 报告"以自然语言为主输入，需求澄清将走 AskUserQuestion 4 维度"
3. `.loop/annotations/` 是否有未处理标注？
   - 有 → 提示用户可加 `--resume` 直接进入迭代循环

## 离开后

dev-proto skill 会写入：
- `.loop/acceptance-checklist.md`
- `.loop/prototype/stories-manifest.md`
- `.loop/api-contracts.json`（若 PRD 有 seed 则以 PRD seed 为基础扩展）
- `.loop/session.json`（`currentPhase: "dev"`，`phases.prototype.status: "completed"`）

独立运行场景下**不自动进入 dev-dev**，只输出：

```
✅ 原型阶段完成
   下一步可选：
   - 继续开发：/dev-dev
   - 单独审查：/dev-review
   - 单独测试：/dev-test
   - 跑完整管线：/dev-loop --resume
```

## 与 /dev-loop 的差异

| 维度 | /dev-loop | /dev-proto |
|------|-----------|------------|
| 完成后是否自动询问进入下阶段 | 是 | 否（用户主动调下一个 slash） |
| 是否写 `session.json.currentPhase` | 是 | 是（按 PHASE_CONTRACT 写） |
| 是否支持 `--from / --to` | 是 | 否（本身就是单阶段） |

---

详细的状态契约见 [PHASE_CONTRACT.md](../PHASE_CONTRACT.md)。
