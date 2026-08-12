import { expect, test, type Page } from '@playwright/test'

type TabletRouteCase = {
    name: string
    path: string
    role?: keyof typeof credentials
}

const credentials = {
    admin: 'admin@autocarehub.test',
    client: 'emily.carter@example.com',
    owner: 'sophia.miller@example.com',
} as const

const routeCases: TabletRouteCase[] = [
    { name: 'help-center', path: '/help' },
    { name: 'pricing', path: '/pricing' },
    { name: 'client-bookings', path: '/profile/bookings', role: 'client' },
    { name: 'client-reviews', path: '/profile/reviews', role: 'client' },
    { name: 'owner-bookings', path: '/owner/bookings', role: 'owner' },
    { name: 'owner-services', path: '/owner/services', role: 'owner' },
    { name: 'admin-dashboard', path: '/admin/dashboard', role: 'admin' },
    { name: 'admin-users', path: '/admin/users', role: 'admin' },
]

const tabletWidths = [768, 1024] as const

async function signIn(page: Page, role: NonNullable<TabletRouteCase['role']>) {
    await page.goto('/login')
    await page.locator('#email').fill(credentials[role])
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).not.toHaveURL(/\/login/)
}

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth <= window.innerWidth + 1,
    )).toBe(true)
}

async function waitForStableTablet(page: Page) {
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts?.ready)
    await expect(page.locator('h1:visible').first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
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

test.describe('tablet route coverage', () => {
    test.beforeEach(async ({ page }) => {
        await page.clock.install({ time: new Date('2026-07-21T12:00:00.000Z') })
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
    })

    for (const routeCase of routeCases) {
        for (const width of tabletWidths) {
            test(`${routeCase.name} stays usable at ${width}px`, async ({ page }, testInfo) => {
                test.skip(testInfo.project.name !== 'tablet-chromium', 'Tablet-only visual coverage')
                await page.setViewportSize({ width, height: 1024 })

                if (routeCase.role) {
                    await signIn(page, routeCase.role)
                }

                await page.goto(routeCase.path)
                await waitForStableTablet(page)

                await expect(page).toHaveScreenshot(
                    `tablet-routes/${routeCase.name}-${width}.png`,
                    { fullPage: true },
                )
            })
        }
    }
})
