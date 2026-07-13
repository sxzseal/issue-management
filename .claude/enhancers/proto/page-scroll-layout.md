---
name: page-scroll-layout
description: 页面默认使用固定 viewport 布局，页面本身不滚动，只在列表/表格/内容区内部滚动；移动端和长表单页例外
enhances: proto
priority: medium
appliesTo: [layout, page, scroll, list, table, dashboard, sidebar, viewport, overflow, panel, workspace]
---

# 页面滚动布局规范（原型阶段）

生成 Storybook story 时，页面级组件（Page / Layout / Dashboard / Workspace / Console 等）默认采用**应用式布局**：整个 viewport 固定，只有内部特定区域滚动。让原型看起来更像 Notion / Linear / Figma，而不是长文档。

## 必须遵守

- 页面根容器使用 `h-screen` + `overflow-hidden`（不用 `min-h-screen`）
- 内部使用 flex 布局分区（header / sidebar / main），可滚动的子区域必须：
  - 设 `flex-1` + `min-h-0`（缺 `min-h-0` 时 flex 子元素撑破父容器，导致外层出现滚动条）
  - 设 `overflow-auto` 或 `overflow-y-auto`
- 头部（TopBar / Header）、侧栏（Sidebar）、工具栏（Toolbar）常驻不参与滚动
- 列表 / 表格 / 消息流 / 卡片网格等主要内容区独立滚动
- 编写 story 时，为 Storybook 预览设置合理的容器高度，让固定布局能被看到（推荐 `parameters.layout: 'fullscreen'`）

## 推荐模式

```tsx
// 标准三段式：Header + Sidebar + Main
<div className="flex h-screen flex-col overflow-hidden">
  <header className="shrink-0 border-b">...</header>
  <div className="flex flex-1 min-h-0">
    <aside className="w-64 shrink-0 overflow-y-auto border-r">...</aside>
    <main className="flex-1 min-h-0 overflow-y-auto">
      {/* 列表 / 内容 */}
    </main>
  </div>
</div>
```

```tsx
// 表格页：表头固定，表体滚动
<div className="flex h-full flex-col overflow-hidden">
  <div className="shrink-0 border-b bg-background">
    {/* 筛选器 / 操作栏 */}
  </div>
  <div className="flex-1 min-h-0 overflow-auto">
    <table>...</table>
  </div>
</div>
```

```tsx
// Story 预设
export default {
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
```

## 例外情况（不套用本规范）

- **移动端优先的页面** — 小屏幕上锁 viewport 会挤压内容，用 `min-h-screen` 让页面整体滚动
- **长表单页** — 设置页、注册流程、详情编辑页等表单字段多的场景，整页滚动更符合用户预期
- **纯营销页 / Landing / Marketing** — 内容驱动的长页面，保持文档式滚动
- **打印视图 / 导出预览** — 需要连续内容流

story 里遇到例外场景时，在 story 描述里注明"该页面属于 XX 例外，整页滚动"。

## 反模式（禁止）

- ❌ 页面根容器用 `min-h-screen`（除非明确属于例外场景）
- ❌ 滚动容器只写 `flex-1 overflow-auto` 不加 `min-h-0`（会破坏内部滚动，滚动条落到 body 上）
- ❌ 给 sidebar 或 header 加 `sticky top-0` 假装常驻（真正的常驻应该是 flex 布局天然的位置固定）
- ❌ 在 story 里让根容器高度自适应内容然后指望"看起来像应用"
