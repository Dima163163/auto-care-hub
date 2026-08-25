import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(
        email.includes('sophia') ? /\/owner\/dashboard/ : /\/admin\/dashboard/,
    )
}

test.describe('owner and administrator critical flows', () => {
    test('owner creates a cabinet and an available service', async ({ page }) => {
        const cabinetTitle = `E2E Studio ${Date.now()}`
        const serviceTitle = `E2E Session ${Date.now()}`

        await signIn(page, 'sophia.miller@example.com')
        await expect(page).toHaveURL(/\/owner\/dashboard/)

        await page.goto('/owner/cabinets/create')
        await page.locator('#title').fill(cabinetTitle)
        await page.locator('#description').fill(
            'A fully equipped studio created by the browser smoke test.',
        )
        await page.locator('#city').fill('Berlin')
        await page.locator('#pricePerHour').fill('75')
        await page.locator('#address').fill('E2E Street 12')
        await page.getByRole('button', { name: /create cabinet/i }).click()

        await expect(page).toHaveURL(/\/owner\/cabinets/)
        await expect(page.getByText(cabinetTitle)).toBeVisible()

        await page.goto('/owner/services')
        await page.locator('#cabinetId').selectOption('cabinet-1')
        await page.locator('#title').fill(serviceTitle)
        await page.locator('#durationMinutes').fill('60')
        await page.locator('#price').fill('75')
        await page.locator('#description').fill(
            'A bookable service created by the browser smoke test.',
        )
        await page.getByRole('button', { name: /create service/i }).click()

        await expect(page.getByText(serviceTitle)).toBeVisible()
    })

    test('owner mobile dashboard keeps the approved workflow visible', async ({ page }) => {
        test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile-only dashboard contract')

        await signIn(page, 'sophia.miller@example.com')
        await expect(page).toHaveURL(/\/owner\/dashboard/)

        await expect(page.getByRole('link', { name: /my spaces/i })).toBeVisible()
        await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
        await expect(page.getByRole('region', { name: /dashboard/i })).toBeVisible()

        const navigation = page.getByRole('navigation', { name: /main navigation/i })
        await expect(navigation.getByRole('link', { name: /dashboard/i })).toBeVisible()
        await expect(navigation.getByRole('link', { name: /bookings/i })).toBeVisible()
        await expect(navigation.getByRole('link', { name: /calendar/i })).toBeVisible()
        await navigation.getByRole('button', { name: /more/i }).click()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /my cabinets/i })).toBeVisible()
        await expect(navigation.getByRole('menu').getByRole('menuitem', { name: /create cabinet/i })).toBeVisible()
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    })

    test('super-admin blocks a cabinet with explicit confirmation', async ({
        page,
    }) => {
        await signIn(page, 'admin@autocarehub.test')
        await expect(page).toHaveURL(/\/admin\/dashboard/)

        await page.goto('/admin/cabinets')
        const cabinetActions = page.locator('select')
        await expect(cabinetActions.first()).toBeVisible()
        await cabinetActions.first().selectOption('blocked')

        await expect(
            page.getByRole('heading', { name: /block this cabinet/i }),
        ).toBeVisible()
        await page
            .getByRole('button', { name: /confirm blocking/i })
            .click()
        await expect(
            page.getByText(/cabinet blocked successfully/i),
        ).toBeVisible()
    })

    test('super-admin acknowledges a separate system incident', async ({ page }) => {
        await signIn(page, 'admin@autocarehub.test')
        await expect(page).toHaveURL(/\/admin\/dashboard/)

        await page.goto('/admin/audit-logs')
        await page.getByRole('button', { name: /system incidents/i }).click()

        await expect(page.getByText(/unhandled server error/i)).toBeVisible()
        await page.getByRole('button', { name: /acknowledge/i }).click()
        await expect(
            page.getByRole('cell', { name: 'Acknowledged', exact: true }),
        ).toBeVisible()
    })

    test('super-admin opens the workspace from the header role badge', async ({ page }) => {
        await signIn(page, 'admin@autocarehub.test')
        await page.goto('/')

        if (test.info().project.name === 'mobile-chromium') {
            await page.getByTestId('mobile-home-menu').click()
        }

        await page.locator('a[title="Admin dashboard"]:visible').click()

        await expect(page).toHaveURL(/\/admin\/dashboard/)
    })

    test('admin sidebar opens every workspace section', async ({ page }) => {
        await signIn(page, 'admin@autocarehub.test')
        await expect(page).toHaveURL(/\/admin\/dashboard/)

        const sections = [
            { href: '/admin/dashboard', heading: /dashboard/i },
            { href: '/admin/users', heading: /^users$/i },
            { href: '/admin/owners', heading: /^owners$/i },
            { href: '/admin/cabinets', heading: /^cabinets$/i },
            { href: '/admin/reviews', heading: /^reviews$/i },
            { href: '/admin/audit-logs', heading: /audit logs/i },
        ]
        const isMobile = test.info().project.name === 'mobile-chromium'
        const mobileNavigation = page.getByRole('navigation', { name: /admin workspace/i })
        const primaryMobileRoutes = new Set([
            '/admin/dashboard',
            '/admin/users',
            '/admin/cabinets',
        ])

        for (const section of sections) {
            if (isMobile && !primaryMobileRoutes.has(section.href)) {
                const moreButton = mobileNavigation.getByRole('button', { name: /more/i })
                if (await moreButton.getAttribute('aria-expanded') !== 'true') {
                    await moreButton.click()
                }
                await mobileNavigation
                    .getByRole('menu')
                    .locator('a[href="' + section.href + '"]')
                    .first()
                    .click()
            } else if (isMobile) {
                await mobileNavigation.locator('a[href="' + section.href + '"]').first().click()
            } else {
                await page.locator('a[href="' + section.href + '"]:visible').first().click()
            }
            await expect(page).toHaveURL(new RegExp(section.href.replaceAll('/', '\\/') + '$'))
            await expect(
                page.getByRole('main').getByRole('heading', {
                    level: 1,
                    name: section.heading,
                }),
            ).toBeVisible()
        }
    })
})
