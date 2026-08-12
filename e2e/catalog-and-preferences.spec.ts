import { expect, test } from '@playwright/test'

test.describe('public catalog and account preferences', () => {
    test('filters the cabinet catalog and opens cabinet details', async ({ page }) => {
        await page.goto('/cabinets')

        await expect(page.getByRole('heading', { name: /available cabinets/i })).toBeVisible()
        await page.locator('input[placeholder*="Search by title"]:visible').fill('Berlin')
        await expect(page.getByRole('link', { name: /view details/i }).first()).toBeVisible()
        await Promise.all([
            page.waitForURL(/\/cabinets\/cabinet-/),
            page.getByRole('link', { name: /view details/i }).first().click(),
        ])

        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('clears an empty catalog search from the empty state', async ({ page }) => {
        await page.goto('/cabinets')
        await page.locator('input[placeholder*="Search by title"]:visible').fill('No matching cabinet')

        await expect(page.getByText(/no cabinets found/i)).toBeVisible()
        await page.getByRole('button', { name: /clear filters/i }).click()

        await expect(page.getByRole('link', { name: /view details/i }).first()).toBeVisible()
    })

    test('keeps loaded public catalog data visible when the browser goes offline', async ({ page }) => {
        await page.goto('/cabinets')

        const catalogHeading = page.getByRole('heading', { name: /available cabinets/i })
        const firstCabinet = page.getByRole('link', { name: /view details/i }).first()

        await expect(catalogHeading).toBeVisible()
        await expect(firstCabinet).toBeVisible()

        await page.context().setOffline(true)
        try {
            await expect(page.getByRole('alert')).toContainText(/you are offline/i)
            await expect(catalogHeading).toBeVisible()
            await expect(firstCabinet).toBeVisible()
            await expect(page.getByText(/failed to load cabinets/i)).not.toBeVisible()
        } finally {
            await page.context().setOffline(false)
        }
    })

    test('keeps the desktop list and live map markers in sync', async ({ page }) => {
        test.skip(test.info().project.name === 'mobile-chromium', 'The map is intentionally replaced by compact mobile results')

        await page.goto('/cabinets')

        await expect(page.locator('.leaflet-container')).toBeVisible()
        await expect(page.getByRole('link', { name: /view details/i }).first()).toBeVisible()
        await expect(page.locator('.price-label')).toHaveCount(6)

        await page.locator('main article[aria-label]').nth(1).click()

        await expect(page.locator('.price-label.selected')).toHaveCount(1)
        await expect(page.getByText('Selected cabinet')).toBeVisible()
        await expect(page.getByRole('button', { name: /zoom in/i })).toBeVisible()
    })

    test('switches the desktop catalog between list and map views', async ({ page }) => {
        test.skip(test.info().project.name === 'mobile-chromium', 'The view switcher is intentionally hidden on compact mobile results')

        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto('/cabinets')

        const splitButton = page.getByRole('button', { name: /list \+ map/i })
        const listButton = page.getByRole('button', { name: /^list$/i })
        const mapButton = page.getByRole('button', { name: /^map$/i })
        const firstCabinet = page.locator('main article[aria-label]').first()

        await expect(splitButton).toHaveAttribute('aria-pressed', 'true')
        await expect(firstCabinet).toBeVisible()
        await expect(page.locator('.leaflet-container')).toBeVisible()

        await mapButton.click()
        await expect(page.getByRole('button', { name: /back to list and map/i })).toBeVisible()
        await expect(firstCabinet).not.toBeVisible()
        await expect(page.locator('.leaflet-container')).toBeVisible()

        await page.getByRole('button', { name: /back to list/i }).click()
        await expect(splitButton).toHaveAttribute('aria-pressed', 'true')
        await expect(firstCabinet).toBeVisible()

        await listButton.click()
        await expect(listButton).toHaveAttribute('aria-pressed', 'true')
        await expect(firstCabinet).toBeVisible()
        await expect(page.locator('.leaflet-container')).not.toBeVisible()

        await splitButton.click()
        await expect(splitButton).toHaveAttribute('aria-pressed', 'true')
        await expect(page.locator('.leaflet-container')).toBeVisible()
    })

    test('keeps the map visible during desktop list scroll and places it above mobile lists', async ({ page }, testInfo) => {
        await page.goto('/cabinets')

        const map = page.getByRole('region', { name: /area map/i })
        const firstCabinetLink = page.getByRole('link', { name: /view details/i }).first()
        await expect(map).toBeVisible()
        await expect(firstCabinetLink).toBeVisible()

        if (testInfo.project.name === 'chromium') {
            await expect.poll(() => map.evaluate((element) => getComputedStyle(element).position)).toBe('sticky')
            await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
            await expect.poll(() => map.evaluate((element) => Math.abs(element.getBoundingClientRect().top) <= 2)).toBe(true)
            return
        }

        const mapTop = await map.evaluate((element) => element.getBoundingClientRect().top)
        const firstCabinetTop = await firstCabinetLink.evaluate((element) => element.getBoundingClientRect().top)
        expect(mapTop).toBeLessThan(firstCabinetTop)
    })

    test('registers a client and reaches onboarding', async ({ page }) => {
        const email = `e2e-client-${Date.now()}@example.com`

        await page.goto('/register')
        await page.locator('#name').fill('E2E Client')
        await page.locator('#email').fill(email)
        await page.locator('#password').fill('password123')
        await page.locator('#confirmPassword').fill('password123')
        await page.getByRole('button', { name: /create account/i }).click()

        await expect(page).toHaveURL(/\/onboarding/)
        await expect(
            page.getByRole('heading', { name: /welcome, e2e client/i }),
        ).toBeVisible()
    })

    test('persists theme and language controls', async ({ page }) => {
        await page.goto('/')

        const mobileMenu = page.getByTestId('mobile-home-menu')
        if (test.info().project.name === 'mobile-chromium') {
            await expect(mobileMenu).toBeVisible()
            await mobileMenu.click()
            await expect(mobileMenu).toHaveAttribute('aria-expanded', 'true')
        }

        const visibleHeader = page.locator('header:visible').first()
        await visibleHeader.getByRole('switch', { name: /switch to dark theme/i }).click()
        await expect(page.locator('html')).toHaveClass(/dark/)

        await visibleHeader.locator('button[aria-label="Language"]').click()
        await page.getByRole('menuitem', { name: /русский|russian/i }).click()
        await expect(page.getByRole('link', { name: 'Кабинеты' }).first()).toBeVisible()
    })

    test('client creates a booking from cabinet details', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)

        await page.goto('/cabinets/cabinet-1')
        await expect(page.locator('.cabinet-detail-map.leaflet-container')).toBeVisible()
        await expect(page.getByRole('link', { name: /plan route/i })).toHaveAttribute(
            'href',
            /google\.com\/maps\/dir/,
        )
        await page.getByRole('button', {
            name: /standard beauty session/i,
        }).click()

        const availableDay = page
            .locator('[role="gridcell"] button:not([disabled])')
            .last()
        await availableDay.click()

        const availableTime = page
            .locator('button:not([disabled])')
            .filter({ hasText: /^\d{2}:\d{2}/ })
            .first()
        await expect(availableTime).toBeVisible()
        await availableTime.click()

        await page.getByRole('button', { name: /create booking/i }).click()
        await expect(
            page.getByRole('heading', { name: /your time is reserved/i }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /view my bookings/i }),
        ).toBeVisible()
        await expect(
            page.getByRole('link', { name: /add to calendar/i }),
        ).toHaveAttribute('href', /calendar\.google\.com\/calendar\/render/)
        await expect(
            page.getByRole('link', { name: /open directions/i }).last(),
        ).toHaveAttribute('href', /google\.com\/maps\/dir/)
    })

    test('client mobile booking card exposes details and directions', async ({ page }) => {
        test.skip(test.info().project.name !== 'mobile-chromium', 'Mobile-only booking composition')

        await page.goto('/login')
        await page.locator('#email').fill('emily.carter@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in/i }).click()
        await expect(page).toHaveURL(/\/profile$/)
        await page.goto('/profile/bookings')

        await expect(page.getByRole('heading', { name: /my bookings/i })).toBeVisible()
        await expect(page.getByText(/directions/i).first()).toBeVisible()
        await expect(page.getByRole('link', { name: /open in maps/i }).first()).toHaveAttribute(
            'href',
            /google\.com\/maps\/dir/,
        )
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    })

})
