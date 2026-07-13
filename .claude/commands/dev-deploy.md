---
description: 独立部署 skill：Pre-flight 检查 + Vercel/Railway 部署 + 健康检查。部署不在 /dev-loop 主管线内，作为独立命令按需调用。
---

# /dev-deploy — 独立部署命令

你现在被显式要求执行**独立部署**。部署**不是 `/dev-loop` 的一部分**（主管线到 dev 就结束），只在用户主动调用时运行。

## 输入

```
/dev-deploy [preview|staging|production]
```

- `$ARGUMENTS` — 可选环境名，默认 `preview`

## 前置条件（硬要求 — 不满足直接报错）

- ✅ 代码可编译（`npm run build` / `tsc --noEmit` 通过）
- ✅ Git 工作区干净（无未提交变更，或用户明确确认要带未提交变更部署）
- ✅ Vercel / Railway CLI 已安装并登录

**软前置**（缺失时警告但不阻断）：
- `.loop/api-contracts.json` 不存在 → 警告「API 契约未机器化，前后端可能不一致」
- `.loop/dev/acceptance-coverage.md` 不存在 → 警告「无验收覆盖报告，无法确认本次部署对应哪些 AC」
- `.loop/review/findings.md` 中含 CRITICAL → 警告并要求用户确认

## 上下文约定（独立 skill，跟 /dev-review、/dev-test 同类）

可能场景：
1. **主管线走完后部署**：`currentPhase === "done"`，用户想上线
2. **热修复部署**：改完一个小 bug 直接部署，不走管线
3. **冷启动部署**：项目根本没跑过 /dev-loop，但代码可编译，直接部署（合法路径，只警告）
4. **回滚 / 重部署**：production 挂了，preview 已验证，重跑一次

**关键**：dev-deploy 是**独立 skill**，与 `/dev-review` / `/dev-test` 同类。它**不写** `currentPhase` / `phases.*`，只更新 `lastDeploy` 时间戳 + `artifacts.deployReport`。

## 行为

**完全委托给 `dev-deploy` skill 执行**：

```
Skill(skill="dev-deploy", args="<原始 $ARGUMENTS>")
```

调用前的预检：

1. 跑 `npm run build`（或 `tsc --noEmit`），失败直接终止并报错
2. 跑 `git status`，有未提交变更则用 `AskUserQuestion` 确认是否继续
3. 检查 `.loop/session.json`：
   - 不存在 → 标记本次为「冷启动部署」，仍可继续
   - `currentPhase === "prd"` 或 `"prototype"` → 用 `AskUserQuestion` 警告「主管线尚未走完（开发未完成），确认要直接部署？」
   - `currentPhase === "done"` → 常规部署路径，不额外提示

预检通过后调用 skill。

## 离开后

dev-deploy skill 会写入：
- `.loop/deploy/checklist.md`（部署报告）
- `.loop/deploy/smoke-result.json`（部署后 Playwright 冒烟结果）
- `.loop/session.json`：**只写** `lastDeploy` 时间戳 + `artifacts.deployReport`；**不动** `currentPhase` / `phases.*`

输出：

```
✅ 部署完成
   环境：<env>
   前端：<url>
   后端：<url>
   健康检查：✅ 通过
   下一步可选：
   - 归档当前 Loop：将 .loop/ 移到 .loop/archive/YYYY-MM-DD-<feature>/
   - 开始新 Loop：/dev-loop <新需求>
```

---

详细的状态契约见 [PHASE_CONTRACT.md](../PHASE_CONTRACT.md)。
