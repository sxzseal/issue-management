// LocaleSwitcher unit test.
//
// The switcher's key behavior is that changing the <select> value calls
// `router.replace(pathname, { locale: nextLocale })` — the second argument
// is what tells next-intl to swap the URL prefix. This test locks that
// contract in: dropping `{ locale }` (a real regression risk) would fail
// here even though the e2e test also covers the end-to-end URL change.
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '../helpers/render'

const replaceMock = vi.fn()
const CURRENT_PATH = '/dashboard'

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => CURRENT_PATH,
}))

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>()
  return {
    ...actual,
    useLocale: () => 'zh-CN',
  }
})

import { LocaleSwitcher } from '@/components/locale-switcher'

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    replaceMock.mockReset()
  })

  it('calls router.replace with the current pathname and the newly-selected locale', async () => {
    const { user, getByRole } = render(<LocaleSwitcher />)

    const select = getByRole('combobox')
    await user.selectOptions(select, 'en')

    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith(CURRENT_PATH, { locale: 'en' })
  })

  it('renders an option for every configured locale', () => {
    const { getByRole } = render(<LocaleSwitcher />)
    const select = getByRole('combobox') as HTMLSelectElement
    const values = Array.from(select.options).map((o) => o.value)
    expect(values).toEqual(expect.arrayContaining(['zh-CN', 'en']))
  })
})
