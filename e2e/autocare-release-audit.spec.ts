import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const guestWidths = [360, 390, 414, 540, 682, 768, 790, 1024, 1280, 1440] as const
const supportedLocales = ['en', 'ru', 'ro', 'es', 'de', 'fr', 'pt', 'it', 'pl', 'nl', 'uk', 'cs', 'el', 'sv', 'zh', 'ja', 'ko', 'ar', 'tr', 'hi'] as const
const routeReadyTimeoutMs = 30_000

async function expectNoHorizontalOverflow(page: Page) {
    await expect.poll(async () => {
        try {
            return await page.evaluate(() =>
                document.documentElement.scrollWidth <= window.innerWidth + 1,
            )
        } catch (error) {
            // Locale changes can briefly replace the document between a
            // navigation and the first layout pass. Keep polling instead of
            // turning that expected transition into a flaky release failure.
            if (error instanceof Error && /execution context was destroyed|frame was detached/i.test(error.message)) {
                return false
            }
            throw error
        }
    }).toBe(true)
}

async function expectStableShell(page: Page) {
    await expect(page.locator('header:visible').first()).toBeVisible({ timeout: routeReadyTimeoutMs })
    // The release audit intentionally exercises cold lazy-loaded routes. On
    // the tablet project, the first locale chunk can keep the Suspense shell
    // visible for a few seconds before the page mounts its <main>. Wait for
    // that bounded transition instead of treating the loading fallback as a
    // broken page.
    await expect(page.getByRole('main')).toHaveCount(1, { timeout: routeReadyTimeoutMs })
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible({ timeout: routeReadyTimeoutMs })
    await expectNoHorizontalOverflow(page)
    await expect.poll(() => page.evaluate(() => {
        const text = document.body.innerText
        return !/(?:landing|navigation|common|errors)\.[A-Za-z0-9_.-]+/.test(text)
            && !/\b(?:undefined|null|TODO|FIXME)\b/i.test(text)
    })).toBe(true)
}

async function expectWorkspaceShell(page: Page) {
    await expect(page.getByRole('main')).toHaveCount(1, { timeout: routeReadyTimeoutMs })
    await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible({ timeout: routeReadyTimeoutMs })
    await expectNoHorizontalOverflow(page)
}

async function gotoStable(page: Page, url: string) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
            return
        } catch (error) {
            if (attempt === 1 || !(error instanceof Error) || !/ERR_ABORTED|execution context was destroyed/i.test(error.message)) {
                throw error
            }
        }
    }
}

async function expectKeyboardTraversal(page: Page) {
    const interactive = page.locator('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
    const interactiveCount = await interactive.count()
    // The desktop landing hero contains a deliberately static dashboard
    // preview; its keyboard surface is the global navigation (three links).
    // Keep the audit strict about having a usable focus surface without
    // treating that presentation-only preview as an interactive form.
    expect(interactiveCount).toBeGreaterThanOrEqual(3)

    const focusedTargets = new Set<string>()
    // Visit each currently tabbable control once. Cycling extra times made
    // this audit race route hydration on the shell-only landing frame.
    for (let index = 0; index < Math.min(interactiveCount, 60); index += 1) {
        await page.keyboard.press('Tab')
        const target = await page.evaluate(() => {
            const element = document.activeElement
            if (!(element instanceof HTMLElement)) return ''

            return `${element.tagName}:${element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 40) ?? ''}`
        })
        if (target) focusedTargets.add(target)
    }

    expect(focusedTargets.size).toBeGreaterThanOrEqual(Math.min(3, interactiveCount))
}

async function signInWithMockAccount(page: Page, email: string) {
    await gotoStable(page, '/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /sign in|войти/i }).click()
    await expect(page).toHaveURL(/\/(?:owner\/dashboard|admin\/dashboard|super-admin\/dashboard)$/)
}

async function signOutMockAccount(page: Page) {
    await page.evaluate(async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
    })
}

test.describe('AutoCare stable-web release gate', () => {
    test('mock auth session has a working login, me and logout boundary', async ({ page }) => {
        await gotoStable(page, '/login')
        await page.locator('#email').fill('sophia.miller@example.com')
        await page.locator('#password').fill('password123')

        const loginResponse = page.waitForResponse((response) =>
            response.url().includes('/api/auth/login')
            && response.request().method() === 'POST',
        )
        await page.getByRole('button', { name: /sign in|войти/i }).click()
        expect((await loginResponse).status()).toBe(200)
        await expect(page).toHaveURL(/\/owner\/dashboard$/)

        const meResponse = await page.evaluate(async () => {
            const response = await fetch('/api/auth/me')
            return { status: response.status, body: await response.json() as { email?: string } }
        })
        expect(meResponse.status).toBe(200)
        expect(meResponse.body.email).toBe('sophia.miller@example.com')

        const logoutResponse = await page.evaluate(async () => {
            const response = await fetch('/api/auth/logout', { method: 'POST' })
            return { status: response.status }
        })
        expect(logoutResponse.status).toBe(200)

        const afterLogout = await page.evaluate(async () => {
            const response = await fetch('/api/auth/me')
            return { status: response.status }
        })
        expect(afterLogout.status).toBe(401)

        await page.goto('/owner/dashboard')
        await expect(page).toHaveURL(/\/login(?:\?[^#]*)?$/)
    })

    test('discovery shell stays usable across release breakpoints', async ({ page }) => {
        for (const width of guestWidths) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/services?service=oil-change')
            await expectStableShell(page)
            await expect(page.locator('#comparison-map')).toBeVisible()
            await expect(page.getByRole('button', { name: /start search|начать поиск/i })).toBeVisible()
            await expect(page.getByRole('contentinfo')).toBeVisible()
        }
    })

    test('discovery filters and sort controls are keyboard operable', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto('/services?service=oil-change')
        await expectStableShell(page)

        const sort = page.locator('select').filter({ has: page.locator('option[value="recommended"]') }).first()
        await expect(sort).toBeVisible()
        await sort.selectOption('price_asc')
        await expect(sort).toHaveValue('price_asc')

        const allFilters = page.getByRole('button', { name: /all filters|все фильтры/i })
        await expect(allFilters).toBeVisible()
        await allFilters.click()
        await expect(page.getByRole('button', { name: /start search|начать поиск/i })).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })

    test('public header exposes the correct navigation mode at the burger boundary', async ({ page }) => {
        for (const width of [768, 790, 1024, 1120] as const) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto('/')
            await expect(page.getByTestId('desktop-public-mobile-menu-trigger')).toBeVisible()
            await expect(page.locator('.public-desktop-header__nav')).toBeHidden()
            await page.getByTestId('desktop-public-mobile-menu-trigger').press('Enter')
            await expect(page.locator('#desktop-public-mobile-menu')).toBeVisible()
            await page.keyboard.press('Escape')
            await expect(page.locator('#desktop-public-mobile-menu')).toBeHidden()
        }

        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto('/')
        await expect(page.locator('.public-desktop-header__nav')).toBeVisible()
        await expect(page.getByTestId('desktop-public-mobile-menu-trigger')).toBeHidden()
    })

    test('public discovery satisfies the automated accessibility contract', async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'light')
        })
        await page.goto('/services?service=oil-change')
        await expectStableShell(page)
        const results = await new AxeBuilder({ page }).analyze()
        expect(results.violations).toEqual([])
    })

    test('protected workspaces satisfy the automated accessibility contract', async ({ page }) => {
        test.setTimeout(120_000)
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'dark')
        })
        await signInWithMockAccount(page, 'sophia.miller@example.com')

        for (const route of ['/owner/dashboard', '/owner/autocare-requests', '/owner/services'] as const) {
            await gotoStable(page, route)
            await expectWorkspaceShell(page)
            const results = await new AxeBuilder({ page }).analyze()
            expect(results.violations, `${route} accessibility violations`).toEqual([])
        }

        await signOutMockAccount(page)
        await signInWithMockAccount(page, 'admin@autocarehub.test')
        for (const route of ['/admin/dashboard', '/super-admin/dashboard'] as const) {
            await gotoStable(page, route)
            await expectWorkspaceShell(page)
            const results = await new AxeBuilder({ page }).analyze()
            expect(results.violations, `${route} accessibility violations`).toEqual([])
        }
    })

    test('theme switcher and discovery focus use the rounded control surface', async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('autocare-hub-locale', 'en')
            window.localStorage.setItem('autocare-hub-theme', 'dark')
        })
        await page.goto('/services?service=oil-change')
        await expectStableShell(page)
        await expect(page.locator('html')).toHaveClass(/dark/)
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

        const themeSwitcher = page.locator('[data-theme-switcher]:visible').first()
        await expect(themeSwitcher).toHaveAttribute('aria-checked', 'true')
        await themeSwitcher.click()
        await expect(page.locator('html')).not.toHaveClass(/dark/)
        await expect(themeSwitcher).toHaveAttribute('aria-checked', 'false')

        // FloatingSelect keeps its visible label in a decorative span, so the
        // native select does not expose a reliable accessible name in every
        // locale. Identify the service control by its stable option value.
        const serviceSelect = page.locator('select').filter({ has: page.locator('option[value="oil-change"]') }).first()
        await serviceSelect.focus()
        await expect(serviceSelect).toBeFocused()
        const focusSurface = serviceSelect.locator('xpath=..')
        await expect(focusSurface).toHaveClass(/rounded-\[var\(--radius-control\)\]/)
        const focusStyles = await Promise.all([
            serviceSelect.evaluate((element) => getComputedStyle(element).outlineStyle),
            focusSurface.evaluate((element) => ({
                borderRadius: getComputedStyle(element).borderRadius,
                boxShadow: getComputedStyle(element).boxShadow,
            })),
        ])
        expect(focusStyles[0]).toBe('none')
        expect(focusStyles[1].borderRadius).not.toBe('0px')
        expect(focusStyles[1].boxShadow).not.toBe('none')
    })

    test('buttons and switches activate with Space', async ({ page }) => {
        await gotoStable(page, '/')
        await expectStableShell(page)

        const themeSwitcher = page.locator('[data-theme-switcher]:visible').first()
        await expect(themeSwitcher).toBeVisible()
        const initialChecked = await themeSwitcher.getAttribute('aria-checked')
        expect(initialChecked).toMatch(/^(true|false)$/)

        await themeSwitcher.focus()
        await page.keyboard.press('Space')
        await expect(themeSwitcher).toHaveAttribute('aria-checked', initialChecked === 'true' ? 'false' : 'true')

        await page.keyboard.press('Space')
        await expect(themeSwitcher).toHaveAttribute('aria-checked', initialChecked)
    })

    test('loading shell keeps themed skeletons in light and dark themes', async ({ browser }) => {
        for (const theme of ['light', 'dark'] as const) {
            const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
            const page = await context.newPage()
            await page.addInitScript((nextTheme) => {
                window.localStorage.setItem('autocare-hub-theme', nextTheme)
            }, theme)
            await page.goto('/services', { waitUntil: 'commit' })

            await expect(page.locator('main[aria-busy="true"]').first()).toBeVisible()
            await expect(page.locator('[data-testid="autocare-results-map-skeleton"]').first()).toBeVisible()
            if (theme === 'dark') {
                await expect(page.locator('html')).toHaveClass(/dark/)
            } else {
                await expect(page.locator('html')).not.toHaveClass(/dark/)
            }

            await context.close()
        }
    })

    test('public pages expose a usable keyboard order', async ({ page }) => {
        for (const route of ['/', '/services?service=oil-change', '/services/api-proservice-moscow']) {
            await page.setViewportSize({ width: 1280, height: 900 })
            await gotoStable(page, route)
            await expect(page.locator('header:visible').first()).toBeVisible()
            await expect(page.getByRole('heading').first()).toBeVisible()
            await expectNoHorizontalOverflow(page)
            await expectKeyboardTraversal(page)
        }
    })

    test('protected workspaces expose a usable keyboard order', async ({ page }) => {
        test.setTimeout(240_000)
        await page.setViewportSize({ width: 1280, height: 900 })
        await signInWithMockAccount(page, 'sophia.miller@example.com')

        for (const route of [
            '/owner/dashboard',
            '/owner/autocare-providers',
            '/owner/cabinets',
            '/owner/bookings',
            '/owner/autocare-requests',
            '/owner/reviews',
            '/owner/clients',
            '/owner/services',
            '/profile',
            '/profile/vehicles',
            '/profile/bookings',
            '/profile/reviews',
            '/notifications',
        ]) {
            await gotoStable(page, route)
            await expectWorkspaceShell(page)
            await expectKeyboardTraversal(page)
        }

        await signOutMockAccount(page)
        await signInWithMockAccount(page, 'admin@autocarehub.test')
        for (const route of [
            '/admin/dashboard',
            '/admin/users',
            '/admin/owners',
            '/admin/cabinets',
            '/admin/reviews',
            '/admin/platform-reviews',
            '/admin/audit-logs',
            '/admin/security-center',
            '/admin/chats',
            '/super-admin/dashboard',
            '/super-admin/chats',
        ]) {
            await gotoStable(page, route)
            await expectWorkspaceShell(page)
            await expectKeyboardTraversal(page)
        }
    })

    test('city listbox supports arrows, Home, End and Escape', async ({ page }) => {
        await page.setViewportSize({ width: 790, height: 900 })
        await gotoStable(page, '/')

        const trigger = page.locator('[data-market-switcher] > button').first()
        await expect(trigger).toBeEnabled()
        await trigger.focus()
        await trigger.click()

        const listbox = page.getByRole('listbox', { name: /choose a city|select city|выберите город/i })
        await expect(listbox).toBeVisible()
        const options = listbox.getByRole('option')
        expect(await options.count()).toBeGreaterThan(1)
        await options.first().press('End')
        await expect(options.last()).toBeFocused()
        await options.last().press('Home')
        await expect(options.first()).toBeFocused()
        await options.first().press('ArrowDown')
        await expect(options.nth(1)).toBeFocused()
        await options.nth(1).press('Escape')
        await expect(listbox).toBeHidden()
        await expect(trigger).toBeFocused()
    })

    test('public gallery closes with Escape and returns focus to its trigger', async ({ page }) => {
        await page.goto('/services/api-proservice-moscow')
        const gallery = page.getByTestId('provider-gallery')
        const trigger = gallery.getByRole('button').last()
        await trigger.focus()
        await trigger.press('Enter')
        const dialog = page.getByRole('dialog', { name: /service gallery|галерея сервиса/i })
        await expect(dialog).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
    })

    test('all supported locales render without missing keys or horizontal overflow', async ({ page }) => {
        // Loading each locale is intentionally sequential because translation
        // chunks are lazy-loaded. Give the complete matrix enough time for a
        // cold dev server while keeping every assertion bounded.
        test.setTimeout(180_000)
        await page.setViewportSize({ width: 1280, height: 900 })

        for (const locale of supportedLocales) {
            await gotoStable(page, `/?lang=${locale}`)
            await expect(page.locator('html')).toHaveAttribute('lang', locale, { timeout: 15_000 })
            await page.waitForTimeout(100)
            await expectNoHorizontalOverflow(page)
            await expect.poll(async () => {
                try {
                    return await page.evaluate(() => {
                        const text = document.body.innerText
                        return !/(?:landing|navigation|common|errors)\.[A-Za-z0-9_.-]+/.test(text)
                            && !/\b(?:undefined|null|TODO|FIXME)\b/i.test(text)
                    })
                } catch (error) {
                    if (error instanceof Error && /execution context was destroyed|frame was detached/i.test(error.message)) return false
                    throw error
                }
            }).toBe(true)
        }
    })

    test('Spanish and Romanian stay usable on mobile with long labels', async ({ page }) => {
        for (const locale of ['es', 'ro'] as const) {
            for (const width of [360, 390] as const) {
                await page.setViewportSize({ width, height: 900 })
                await gotoStable(page, `/services?service=oil-change&lang=${locale}`)
                await expect(page.locator('html')).toHaveAttribute('lang', locale)
                await expectStableShell(page)
                await expectNoHorizontalOverflow(page)
                const mobileMenu = page.getByTestId('mobile-home-menu')
                await expect(mobileMenu).toBeVisible()
                await mobileMenu.click()
                await expect(page.locator('#public-mobile-menu')).toBeVisible()
                await page.keyboard.press('Escape')
                await expect(page.locator('#public-mobile-menu')).toBeHidden()

                const longCity = 'San Cristóbal de La Laguna — Región Metropolitana'
                await page.evaluate((value) => {
                    const label = document.querySelector('[data-market-switcher] > button > span')
                    if (label) label.textContent = value
                }, longCity)
                await expectNoHorizontalOverflow(page)
            }
        }
    })

    test('owner workspace exposes AutoCare services and privacy controls', async ({ page }) => {
        await page.goto('/login')
        await page.locator('#email').fill('sophia.miller@example.com')
        await page.locator('#password').fill('password123')
        await page.getByRole('button', { name: /sign in|войти/i }).click()
        await expect(page).toHaveURL(/\/owner\/dashboard$/)

        await page.goto('/owner/services')
        await expectWorkspaceShell(page)
        await expect(page.getByRole('heading', { name: /services and pricing|услуги и цены/i })).toBeVisible()
        await expect(page.getByText(/automotive service catalogue|каталог автоуслуг/i)).toBeVisible()

        await page.goto('/profile?tab=account')
        await expect(page.getByTestId('profile-privacy')).toBeVisible()
        await expectNoHorizontalOverflow(page)
    })

    test('owner onboarding exposes evidence, team and communication controls', async ({ page }) => {
        await signInWithMockAccount(page, 'sophia.miller@example.com')
        await page.goto('/owner/autocare-providers/api-proservice-moscow')
        await expectWorkspaceShell(page)

        await expect(page.getByRole('heading', { name: /onboarding and profile changes|подключение и изменения профиля/i })).toBeVisible()
        await expect(page.getByRole('heading', { level: 2, name: /documents and evidence|документы и подтверждения/i })).toBeVisible()
        await expect(page.getByRole('heading', { name: /branch team|команда филиала/i })).toBeVisible()
        await expect(page.getByTestId('owner-communication-settings')).toBeVisible()

        const profileChangeForm = page.getByRole('heading', { name: /change public details|изменить публичные данные/i }).locator('..')
        await expect(profileChangeForm.getByRole('button', { name: /add document|добавить документ/i })).toBeVisible()
        await profileChangeForm.getByRole('button', { name: /add document|добавить документ/i }).click()
        await expect(profileChangeForm.locator('input[name="documentLabel"]')).toBeVisible()
        await expect(profileChangeForm.locator('input[name="documentReference"]')).toHaveAttribute('pattern', '^private://.*')
        await expect(page.getByTestId('owner-chat-toggle')).toBeChecked()
    })

    test('owner requests keep the compact branch calendar visible without resource editor', async ({ page }) => {
        await signInWithMockAccount(page, 'sophia.miller@example.com')
        await gotoStable(page, '/owner/autocare-requests')

        const calendar = page.getByTestId('owner-capacity-calendar')
        await expect(calendar).toBeVisible()
        await expect(calendar.getByRole('heading', { name: /branch calendar|календарь филиала/i })).toBeVisible()
        await expect(calendar.getByText(/select a date|выберите дату/i)).toBeVisible()
        await expect(page.getByTestId('owner-capacity-resources')).toHaveCount(0)
        await expectNoHorizontalOverflow(page)
    })

    test('admin moderation evidence requires a decision reason', async ({ page }) => {
        await signInWithMockAccount(page, 'admin@autocarehub.test')
        await page.goto('/admin/dashboard')
        await expectWorkspaceShell(page)

        const evidence = page.locator('#admin-moderation-evidence')
        await expect(evidence.getByRole('heading', { name: /moderation evidence|материалы для модерации/i })).toBeVisible()
        const pendingItem = evidence.locator('article').first()
        await expect(pendingItem).toBeVisible()
        await pendingItem.getByRole('button', { name: /approve|одобрить/i }).click()
        await expect(pendingItem).toContainText(/add a note before|добавьте комментарий перед/i)

        await pendingItem.getByRole('textbox', { name: /moderator note|комментарий модератора/i }).fill('Проверено в локальном release smoke.')
        await pendingItem.getByRole('button', { name: /approve|одобрить/i }).click()
        await expect(pendingItem).toContainText(/decision saved|решение сохранено/i)
    })

    test('super-admin market hierarchy exposes country, city and zone editors', async ({ page }) => {
        await signInWithMockAccount(page, 'admin@autocarehub.test')
        await page.goto('/super-admin/dashboard')
        await expectWorkspaceShell(page)

        const hierarchy = page.locator('section').filter({ has: page.getByRole('heading', { name: /countries, cities and zones|страны, города и зоны/i }) }).last()
        await expect(hierarchy).toBeVisible()
        await hierarchy.getByRole('button', { name: /new country|новая страна/i }).click()
        await expect(hierarchy.getByRole('heading', { name: /new country|новая страна/i })).toBeVisible()
        const newCountryForm = hierarchy.locator('form').filter({ hasText: /new country|новая страна/i }).first()
        await expect(newCountryForm.getByRole('textbox', { name: /country code|код страны/i })).toBeVisible()
        await expect(newCountryForm.getByRole('button', { name: /create country|создать страну/i })).toBeVisible()

        await hierarchy.getByRole('button', { name: /new city|новый город/i }).click()
        await expect(hierarchy.getByRole('heading', { name: /new city in|новый город в/i })).toBeVisible()
        await expect(hierarchy.getByRole('button', { name: /create city|создать город/i })).toBeVisible()

        await hierarchy.getByRole('button', { name: /add zone|добавить зону/i }).click()
        await expect(hierarchy.getByRole('heading', { name: /new zone|новая зона/i })).toBeVisible()
        await expect(hierarchy.getByRole('button', { name: /create zone|создать зону/i })).toBeVisible()
    })
})
