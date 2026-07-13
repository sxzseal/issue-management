import { test, expect } from '@playwright/test'
import zhCN from '../../messages/zh-CN.json'
import en from '../../messages/en.json'

test.describe('Home Page', () => {
  test('renders zh-CN subtitle on default locale root', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toBeVisible()
    // Assert the actual translated subtitle, not just "a link exists" — that
    // way a middleware regression that silently served English content on `/`
    // would fail this test.
    await expect(page.getByText(zhCN.Home.subtitle)).toBeVisible()
    await expect(
      page.getByRole('link', { name: zhCN.Home.apiHealth }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: zhCN.Home.storybook }),
    ).toBeVisible()
  })

  test('renders English subtitle when navigating to /en', async ({ page }) => {
    await page.goto('/en')

    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText(en.Home.subtitle)).toBeVisible()
    await expect(
      page.getByRole('link', { name: en.Home.apiHealth }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: en.Home.storybook }),
    ).toBeVisible()
  })

  test('theme toggle cycles the <html class="dark"> attribute', async ({
    page,
  }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', {
      name: new RegExp(
        `${zhCN.ThemeToggle.label}|${en.ThemeToggle.label}`,
        'i',
      ),
    })
    await expect(toggle).toBeVisible()

    // Baseline: default theme is light, so <html> has no `dark` class.
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // First click: light → dark. This is the assertion the dev enhancer
    // (theme-and-i18n) explicitly requires.
    await toggle.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Second click: dark → system. system resolves to light in tests (no OS
    // dark-mode signal), so `dark` should be gone again.
    await toggle.click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('locale switcher navigates to /en and renders English copy', async ({
    page,
  }) => {
    await page.goto('/')
    const switcher = page.getByRole('combobox', {
      name: new RegExp(
        `${zhCN.LocaleSwitcher.label}|${en.LocaleSwitcher.label}`,
        'i',
      ),
    })
    await expect(switcher).toBeVisible()

    await switcher.selectOption('en')

    // Locale switch changes the URL prefix and the rendered copy.
    await expect(page).toHaveURL(/\/en(\/|$)/)
    await expect(page.getByText(en.Home.subtitle)).toBeVisible()
  })

  test('unsupported locale returns 404', async ({ page }) => {
    // Guards `isSupportedLocale` in src/i18n/request.ts and
    // src/app/[locale]/layout.tsx. Without this test, removing the guard
    // would silently render with messages=undefined instead of a 404.
    const response = await page.goto('/fr', { waitUntil: 'commit' })
    expect(response?.status()).toBe(404)
  })

  test('API health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.status).toBe('ok')
  })
})
