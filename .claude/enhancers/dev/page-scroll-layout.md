---
name: page-scroll-layout
description: 页面默认使用固定 viewport 布局，页面本身不滚动，只在列表/表格/内容区内部滚动；移动端和长表单页例外
enhances: dev
priority: medium
appliesTo: [layout, page, scroll, list, table, dashboard, sidebar, viewport, overflow, panel, workspace, route]
---

# 页面滚动布局规范（开发阶段）

将原型阶段确立的"应用式布局"落到真实路由页面（Next.js App Router 的 `page.tsx` / `layout.tsx`）。整个 viewport 固定，只有指定区域滚动。让最终产品的观感接近 Notion / Linear / Figma，而不是长文档。

## 必须遵守

- 路由 `layout.tsx` 的根容器使用 `h-screen` + `overflow-hidden`（不用 `min-h-screen`）
- 内部使用 flex 布局分区，可滚动子区域必须同时具备：
  - `flex-1` + `min-h-0`（缺 `min-h-0` 时 flex 子元素撑破父容器，滚动条会跑到 `body` 上）
  - `overflow-auto` 或 `overflow-y-auto`
- 头部（TopBar）、侧栏（Sidebar）、工具栏（Toolbar）通过 flex 布局天然常驻，不参与滚动
- 列表 / 表格 / 消息流 / 卡片网格等主要内容区独立滚动，配合虚拟化（`@tanstack/react-virtual` 等）性能更佳
- `app/globals.css` 里 `html, body` 不加 `overflow-hidden`（会破坏例外场景），滚动锁定放在具体 layout 上
- 使用 `next/font` 时给 `html` 加 `className={inter.variable}`，`body` 保持默认高度行为（`h-full` 由 layout 控制）

## 推荐模式

```tsx
// app/(app)/layout.tsx — 应用主区
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar className="shrink-0" />
      <div className="flex flex-1 min-h-0">
        <Sidebar className="w-64 shrink-0 overflow-y-auto border-r" />
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// 列表页：内容区自身再分区
export default function OrdersPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b p-4">
        <FilterBar />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <DataTable rows={rows} />
      </div>
    </div>
  );
}
```

```tsx
// 使用 shadcn ScrollArea 时也要保证父级 min-h-0
<div className="flex-1 min-h-0">
  <ScrollArea className="h-full">...</ScrollArea>
</div>
```

## 例外情况（改用整页滚动）

以下路由用 `min-h-screen` 而不是 `h-screen + overflow-hidden`：

- **移动端优先路由** — 用 `useMediaQuery` 或 CSS `@media (max-width: 768px)` 判断，小屏降级为整页滚动
- **长表单路由** — `/settings/*`、`/onboarding/*`、`/register`、`/profile/edit` 等表单字段多的页面
- **营销 / Landing 路由** — `/`（如果是营销首页）、`/pricing`、`/about` 等内容驱动页面
- **文档 / 博客路由** — `/docs/*`、`/blog/*`

例外路由应放在独立的 route group（如 `app/(marketing)/layout.tsx`），layout 内使用 `min-h-screen`，主 app 的 `(app)` group 保持固定 viewport 布局。

## 响应式降级模式

```tsx
// 在需要兼容移动端的应用主区
<div className="flex flex-col overflow-hidden md:h-screen">
  {/* 移动端整页滚动，md 以上锁定 viewport */}
</div>
```

## 反模式（禁止）

- ❌ 在 `app/layout.tsx` 根 layout 就锁死 `h-screen overflow-hidden`（会让例外路由无法整页滚动，改在 route group 层做）
- ❌ 滚动容器只写 `flex-1 overflow-auto` 不加 `min-h-0`
- ❌ 用 `position: fixed` + `top-0 left-0 right-0` 手动实现 header 常驻（应用 flex 天然实现）
- ❌ 用 `100vh` 硬编码高度（移动端 `100vh` 包含地址栏高度会溢出，改用 `h-screen` + Tailwind 的 `dvh` 变体 `h-dvh` 处理）
- ❌ 全局 `body { overflow: hidden }`（破坏例外路由）

## 检查清单

写完 layout / page 后：

- [ ] 根容器是 `h-screen` + `overflow-hidden`（非例外场景）
- [ ] 所有 `flex-1` 的滚动子容器都有 `min-h-0`
- [ ] 移动端最窄断点下内容不被裁掉（`sm` / `md` 断点降级或整页滚动）
- [ ] 键盘弹起 / 输入法遮挡时列表滚动仍可用（移动端场景）
- [ ] 例外路由放在独立 route group，不与主 app group 冲突
