import { expect, test, type Page } from '@playwright/test'

type VisualTheme = 'dark' | 'light'
type VisualLocale = 'en' | 'ru' | 'ar'

type VisualCase = {
    name: string
    locale: VisualLocale
    path: string
    role?: 'admin' | 'client' | 'owner'
    theme: VisualTheme
}

const visualCases: VisualCase[] = [
    {
        name: 'public-home-en-light',
        locale: 'en',
        path: '/',
        theme: 'light',
    },
    {
        name: 'public-catalog-en-light',
        locale: 'en',
        path: '/cabinets',
        theme: 'light',
    },
    {
        name: 'public-catalog-ru-dark',
        locale: 'ru',
        path: '/cabinets',
        theme: 'dark',
    },
    {
        name: 'public-home-ar-light',
        locale: 'ar',
        path: '/',
        theme: 'light',
    },
    {
        name: 'public-catalog-ar-dark',
        locale: 'ar',
        path: '/cabinets',
        theme: 'dark',
    },
    {
        name: 'cabinet-detail-en-light',
        locale: 'en',
        path: '/cabinets/cabinet-1',
        theme: 'light',
    },
    {
        name: 'cabinet-detail-ru-dark',
        locale: 'ru',
        path: '/cabinets/cabinet-1',
        theme: 'dark',
    },
    {
        name: 'help-center-en-light',
        locale: 'en',
        path: '/help',
        theme: 'light',
    },
    {
        name: 'pricing-en-light',
        locale: 'en',
        path: '/pricing',
        theme: 'light',
    },
    {
        name: 'client-profile-en-light',
        locale: 'en',
        path: '/profile',
        role: 'client',
        theme: 'light',
    },
    {
        name: 'client-profile-ru-dark',
        locale: 'ru',
        path: '/profile',
        role: 'client',
        theme: 'dark',
    },
    {
        name: 'client-profile-ar-light',
        locale: 'ar',
        path: '/profile',
        role: 'client',
        theme: 'light',
    },
    {
        name: 'client-bookings-en-light',
        locale: 'en',
        path: '/profile/bookings',
        role: 'client',
        theme: 'light',
    },
    {
        name: 'owner-dashboard-en-light',
        locale: 'en',
        path: '/owner/dashboard',
        role: 'owner',
        theme: 'light',
    },
    {
        name: 'owner-dashboard-ru-dark',
        locale: 'ru',
        path: '/owner/dashboard',
        role: 'owner',
        theme: 'dark',
    },
    {
        name: 'owner-bookings-en-light',
        locale: 'en',
        path: '/owner/bookings',
        role: 'owner',
        theme: 'light',
    },
    {
        name: 'admin-audit-en-light',
        locale: 'en',
        path: '/admin/audit-logs',
        role: 'admin',
        theme: 'light',
    },
    {
        name: 'admin-audit-ru-dark',
        locale: 'ru',
        path: '/admin/audit-logs',
        role: 'admin',
        theme: 'dark',
    },
    {
        name: 'admin-users-en-light',
        locale: 'en',
        path: '/admin/users',
        role: 'admin',
        theme: 'light',
    },
]

const credentials = {
    admin: 'admin@autocarehub.test',
    client: 'emily.carter@example.com',
    owner: 'sophia.miller@example.com',
} as const

const VISUAL_NOW = new Date('2026-07-21T12:00:00.000Z')

async function prepareVisualState(
    page: Page,
    locale: VisualLocale,
    theme: VisualTheme,
) {
    await page.addInitScript(
        ({ locale: initialLocale, theme: initialTheme }) => {
            window.localStorage.setItem('autocare-hub-locale', initialLocale)
            window.localStorage.setItem('autocare-hub-theme', initialTheme)
        },
        { locale, theme },
    )
}

async function signIn(page: Page, role: NonNullable<VisualCase['role']>) {
    await page.goto('/login')
    await page.locator('#email').fill(credentials[role])
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти|تسجيل الدخول/i }).click()
}

async function waitForStableVisual(page: Page) {
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible({
        timeout: 15_000,
    })
    await page.evaluate(() => document.fonts?.ready)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    await expect.poll(() => page.evaluate(() => [...document.images]
        .filter((image) => {
            const bounds = image.getBoundingClientRect()
            return bounds.top < window.innerHeight && bounds.bottom > 0
        })
        .every((image) => image.complete && image.naturalWidth > 0 && (
            image.dataset.imageState === undefined || image.dataset.imageState === 'loaded'
        )))).toBe(true)
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                caret-color: transparent !important;
            }
        `,
    })
}

for (const visualCase of visualCases) {
    test(`${visualCase.name} remains stable`, async ({ page }) => {
        await page.clock.install({ time: VISUAL_NOW })
        await prepareVisualState(page, visualCase.locale, visualCase.theme)

        if (visualCase.role) {
            await signIn(page, visualCase.role)
        }

        await page.goto(visualCase.path)
        await waitForStableVisual(page)

        if (visualCase.locale === 'ar') {
            const visibleCopy = await page.locator('main').innerText()
            if (visualCase.path === '/cabinets') {
                expect(visibleCopy).toContain('مساحات بالقرب منك')
            }
            if (visualCase.path === '/profile') {
                expect(visibleCopy).toContain('ملفي الشخصي')
            }
            expect(visibleCopy).not.toMatch(
                /\b(?:Public catalog|Available cabinets|Browse active cabinets|Availability-first discovery|Cabinets around you|My profile|Account details|Notifications|Search by title or city|Sort by|Newest first|List \+ map|View details)\b/i,
            )
        }

        if (visualCase.path === '/profile') {
            await expect(page.getByTestId('profile-preferences')).toHaveCount(1)
            await expect(page.getByTestId('profile-navigation')).toBeHidden()
        }

        if (visualCase.path === '/owner/dashboard') {
            await expect(page.locator('body')).not.toContainText(/(^|\n)\.\.\.(\n|$)/)
        }

        await expect(page).toHaveScreenshot(`${visualCase.name}.png`, {
            fullPage: true,
        })
    })
}
