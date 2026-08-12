import { expect, test, type Page } from '@playwright/test'

const DEMO_CLIENT_EMAIL = 'client.demo@autocarehub.test'
const DEMO_OWNER_EMAIL = 'owner.demo@autocarehub.test'
const DEMO_ADMIN_EMAIL = 'admin.demo@autocarehub.test'
const DEMO_SUPER_ADMIN_EMAIL = 'superadmin.demo@autocarehub.test'
const DEMO_PASSWORD = '123456'
const DEMO_CABINET_TITLE = 'Demo Wellness Cabinet'
const DEMO_OWNER_NAME = 'Demo Owner'

async function signIn(page: Page, email: string) {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(DEMO_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
}

test.describe('real backend smoke', () => {
    test('real auth pages do not expose mock guidance', async ({ page }) => {
        await page.goto('/login')

        await expect(page.getByText('Enter your account credentials to continue.')).toBeVisible()
        await expect(page.getByText('Mock users')).toHaveCount(0)
        await expect(page.getByText(/any value for mock login/i)).toHaveCount(0)

        await page.goto('/register')

        await expect(page.getByText('Create your AutoCare Hub account to get started.')).toBeVisible()
        await expect(page.getByText(/create a mock client or owner account/i)).toHaveCount(0)
    })

    test('guest can browse the seeded public cabinet catalog', async ({ page }) => {
        await page.goto('/cabinets')

        await expect(page).toHaveURL(/\/cabinets/)
        await expect(page.getByText(DEMO_CABINET_TITLE).first()).toBeVisible()
    })

    test('client can open the real cabinet services and booking form', async ({ page }) => {
        await signIn(page, DEMO_CLIENT_EMAIL)
        await expect(page).toHaveURL(/\/profile$/)

        await page.goto('/cabinets')
        const demoCabinet = page
            .locator('article')
            .filter({ hasText: DEMO_CABINET_TITLE })
            .first()
        await demoCabinet.getByRole('link', { name: /view details/i }).click()
        await expect(page).toHaveURL(/\/cabinets\//)
        await expect(page.getByRole('heading', { name: /book this cabinet/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /demo consultation/i })).toBeVisible()
    })

    test('client sees seeded booking and owner confirms the pending request', async ({
        page,
    }) => {
        await signIn(page, DEMO_CLIENT_EMAIL)
        await expect(page).toHaveURL(/\/profile$/)

        await page.goto('/profile/bookings')
        await expect(page.getByText(DEMO_CABINET_TITLE).first()).toBeVisible()
        await expect(page.getByText('Demo Consultation').first()).toBeVisible()

        await page.context().clearCookies()

        await signIn(page, DEMO_OWNER_EMAIL)
        await expect(page).toHaveURL(/\/owner\/dashboard/)

        await page.goto('/owner/bookings')
        const demoBooking = page
            .locator('article')
            .filter({ hasText: DEMO_CABINET_TITLE })
            .first()

        await expect(demoBooking).toBeVisible()
        await demoBooking
            .getByRole('button', { name: /change/i })
            .click()
        await demoBooking
            .getByRole('option', { name: /confirmed/i })
            .click()

        await expect(
            page.getByText(/booking status updated successfully/i),
        ).toBeVisible()
    })

    test('ordinary admin dashboard renders real aggregate data', async ({ page }) => {
        await signIn(page, DEMO_ADMIN_EMAIL)
        await expect(page).toHaveURL(/\/admin\/dashboard/)
        await expect(
            page.getByRole('main').getByRole('heading', { name: /dashboard/i }),
        ).toBeVisible()
        await expect(
            page.getByText(/failed to load admin dashboard/i),
        ).toHaveCount(0)
    })

    test('ordinary admin can inspect platform users', async ({ page }) => {
        await signIn(page, DEMO_ADMIN_EMAIL)
        await expect(page).toHaveURL(/\/admin\/dashboard/)

        await page.goto('/admin/users')
        await expect(page.getByRole('heading', { name: /^users$/i })).toBeVisible()
        await expect(page.getByText(DEMO_OWNER_NAME).first()).toBeVisible()
    })

    test('super-admin can open audit logs and system incidents', async ({ page }) => {
        await signIn(page, DEMO_SUPER_ADMIN_EMAIL)
        await expect(page).toHaveURL(/\/admin\/dashboard/)

        await page.goto('/admin/audit-logs')
        await expect(
            page.getByRole('heading', { name: /audit logs/i }),
        ).toBeVisible()
        await expect(page.getByText(/failed to load/i)).toHaveCount(0)
        await expect(
            page.getByRole('button', { name: /system incidents/i }),
        ).toBeVisible()
    })
})
