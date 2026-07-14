/**
 * Accessibility skip-link — first focusable element on the page, jumps to `#main`
 * so keyboard users don't have to tab through side-nav + top-bar every route.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-sm focus:text-primary-foreground"
    >
      跳到主内容
    </a>
  )
}
