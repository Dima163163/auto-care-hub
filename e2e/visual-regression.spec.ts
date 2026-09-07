import { expect, test, type Page } from '@playwright/test'

type VisualLocale = 'en' | 'ru'
type VisualTheme = 'light' | 'dark'
type VisualRole = 'client' | 'owner' | 'admin'

type VisualCase = {
    name: string
    path: string
    locale: VisualLocale
    theme: VisualTheme
    role?: VisualRole
}

const visualCases: VisualCase[] = [
    {
        name: 'autocare-home-en-light',
        path: '/',
        locale: 'en',
        theme: 'light',
    },
    {
        name: 'autocare-discovery-ru-dark',
        path: '/services?service=oil-change',
        locale: 'ru',
        theme: 'dark',
    },
    {
        name: 'autocare-provider-en-light',
        path: '/services/api-proservice-moscow',
        locale: 'en',
        theme: 'light',
    },
    {
        name: 'autocare-client-profile-en-light',
        path: '/profile',
        locale: 'en',
        theme: 'light',
        role: 'client',
    },
    {
        name: 'autocare-owner-dashboard-ru-dark',
        path: '/owner/dashboard',
        locale: 'ru',
        theme: 'dark',
        role: 'owner',
    },
    {
        name: 'autocare-admin-security-en-light',
        path: '/admin/security-center',
        locale: 'en',
        theme: 'light',
        role: 'admin',
    },
]

const credentials: Record<VisualRole, string> = {
    client: 'emily.carter@example.com',
    owner: 'sophia.miller@example.com',
    admin: 'admin@autocarehub.test',
}

async function prepareVisualState(page: Page, visualCase: VisualCase) {
    await page.addInitScript(({ locale, theme }) => {
        window.localStorage.setItem('autocare-hub-locale', locale)
        window.localStorage.setItem('autocare-hub-theme', theme)
    }, { locale: visualCase.locale, theme: visualCase.theme })
}

async function signIn(page: Page, role: VisualRole) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#email').fill(credentials[role])
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
}

async function waitForStableVisual(page: Page) {
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('main')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible({ timeout: 30_000 })
    await page.evaluate(() => document.fonts?.ready)
    await page.waitForTimeout(750)
    await expect.poll(() => page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth + 1
    })).toBe(true)
    await expect.poll(() => page.evaluate(() => {
        const text = document.body.innerText
        return !/(?:landing|navigation|common|errors)\.[A-Za-z0-9_.-]+/.test(text)
            && !/\b(?:undefined|null|TODO|FIXME)\b/i.test(text)
    })).toBe(true)
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
    test(`${visualCase.name} is visually stable`, async ({ page }) => {
        await page.clock.install({ time: new Date('2026-09-07T10:00:00.000Z') })
        await prepareVisualState(page, visualCase)

        if (visualCase.role) await signIn(page, visualCase.role)

        await page.goto(visualCase.path, { waitUntil: 'domcontentloaded' })
        await waitForStableVisual(page)

        await expect(page).toHaveScreenshot(`${visualCase.name}.png`, {
            fullPage: true,
        })
    })
}
