import AxeBuilder from '@axe-core/playwright'
import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.UI_UX_BASE_URL ?? 'http://127.0.0.1:5187'
if (!['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname)) throw new Error('Synthetic UI audit requires a loopback preview')
const output = path.resolve(process.env.UI_UX_OUTPUT ?? 'output/playwright/ui-ux-audit')
const profiles = [
    { name: 'mobile-ru-dark', width: 360, height: 844, locale: 'ru', theme: 'dark' },
    { name: 'tablet-en-light', width: 768, height: 1024, locale: 'en', theme: 'light' },
    { name: 'desktop-en-light', width: 1440, height: 900, locale: 'en', theme: 'light' },
    { name: 'desktop-ru-dark', width: 1440, height: 900, locale: 'ru', theme: 'dark' },
]
const groups = [
    { role: 'guest', routes: ['/', '/services?service=oil-change&market=moscow', '/services/api-proservice-moscow', '/reviews', '/features', '/for-owners', '/about', '/favorites', '/blog', '/partners', '/contacts', '/help', '/agreement', '/rules', '/privacy', '/login', '/register', '/forgot-password', '/password/reset', '/verify-email', '/onboarding'] },
    { role: 'client', email: 'emily.carter@example.com', routes: ['/profile', '/profile?tab=account', '/profile/vehicles', '/profile/bookings', '/profile/reviews', '/notifications', '/chats', '/favorites', '/services/api-proservice-moscow/request?service=oil-change'] },
    { role: 'owner', email: 'sophia.miller@example.com', routes: ['/owner/dashboard', '/owner/autocare-providers', '/owner/autocare-providers/api-proservice-moscow', '/owner/autocare-requests', '/owner/services', '/owner/reviews', '/owner/clients', '/owner/chats'] },
    { role: 'staff', email: 'ilya.orlov@proservice.test', routes: ['/owner/dashboard', '/owner/autocare-requests?provider=api-proservice-moscow'] },
    { role: 'admin', email: 'admin@autocarehub.test', routes: ['/admin/dashboard', '/admin/users', '/admin/owners', '/admin/reviews', '/admin/platform-reviews', '/admin/audit-logs', '/admin/security-center', '/admin/chats', '/super-admin/dashboard', '/super-admin/chats'] },
]
const browserPath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((candidate) => candidate && existsSync(candidate))
if (!browserPath) throw new Error('An installed Chromium browser is required')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: browserPath, headless: true })
const report = { startedAt: new Date().toISOString(), baseUrl, profiles, plannedCases: profiles.length * groups.reduce((sum, group) => sum + group.routes.length, 0), results: [], failures: [] }
const save = () => writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
try {
    for (const profile of profiles) {
        for (const group of groups) {
            const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, reducedMotion: 'reduce' })
            const page = await context.newPage()
            const exceptions = []
            page.on('pageerror', (error) => exceptions.push(error.message))
            await page.addInitScript(({ locale, theme }) => {
                localStorage.setItem('autocare-hub-locale', locale)
                localStorage.setItem('autocare-hub-theme', theme)
                localStorage.setItem('autocare-hub:preferred-market', 'moscow')
            }, profile)
            if (group.email) {
                await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
                await page.locator('html[data-autocare-ready="ready"]').waitFor()
                await page.locator('#email').fill(group.email)
                await page.locator('#password').fill('password123')
                await page.getByRole('button', { name: /^(sign in|войти)$/i }).click()
                await page.waitForURL((url) => !url.pathname.startsWith('/login'))
            }
            for (const route of group.routes) {
                const id = `${profile.name}-${group.role}-${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}`
                const result = { id, profile: profile.name, role: group.role, route }
                try {
                    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
                    await page.locator('html[data-autocare-ready="ready"]').waitFor({ timeout: 30_000 })
                    await page.getByRole('main').getByRole('heading').first().waitFor({ timeout: 15_000 })
                    await page.waitForFunction(() => [...document.querySelectorAll('[aria-busy="true"]')].every((node) => node.getBoundingClientRect().height === 0), undefined, { timeout: 8_000 }).catch(() => undefined)
                    await page.evaluate(() => document.fonts.ready)
                    result.layout = await page.evaluate(() => {
                        const visible = (element) => element.checkVisibility() && element.getBoundingClientRect().width > 0
                        const buttons = [...document.querySelectorAll('button, [role="button"], [role="switch"]')].filter(visible)
                        const idCounts = new Map()
                        for (const element of document.querySelectorAll('[id]')) idCounts.set(element.id, (idCounts.get(element.id) ?? 0) + 1)
                        const referencedIds = [...document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls], [aria-activedescendant]')].flatMap((element) => ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant'].flatMap((attribute) => (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)))
                        return {
                            actualPath: location.pathname,
                            width: innerWidth,
                            scrollWidth: document.documentElement.scrollWidth,
                            mainCount: [...document.querySelectorAll('main')].filter(visible).length,
                            h1Count: [...document.querySelectorAll('h1')].filter(visible).length,
                            duplicateReferencedIds: [...new Set(referencedIds.filter((id) => (idCounts.get(id) ?? 0) > 1))],
                            clippedHeaderControls: [...document.querySelectorAll('header button, header [role="switch"], header a')].filter(visible).filter((element) => { const bounds = element.getBoundingClientRect(); return bounds.left < -1 || bounds.right > innerWidth + 1 }).map((element) => element.getAttribute('aria-label') ?? element.textContent.trim().slice(0, 50)),
                            untranslated: /(?:landing|navigation|common|errors|autocare)\.[A-Za-z0-9_.-]+/.test(document.body.innerText),
                            brokenImages: [...document.images].filter((image) => visible(image) && image.complete && image.naturalWidth === 0).map((image) => image.getAttribute('src')),
                            smallTargets: buttons.filter((element) => { const r = element.getBoundingClientRect(); return r.width < 24 || r.height < 24 }).map((element) => ({ name: element.getAttribute('aria-label') ?? element.textContent.trim().slice(0, 50), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
                            reducedMotionAnimations: document.getAnimations().filter((animation) => animation.playState === 'running' && animation.effect.getComputedTiming().iterations === Infinity).length,
                        }
                    })
                    const axe = await new AxeBuilder({ page }).analyze()
                    result.axe = { passes: axe.passes.length, incomplete: axe.incomplete.map((rule) => ({ id: rule.id, nodes: rule.nodes.length, review: rule.nodes.map((node) => ({ target: node.target, checks: [...node.any, ...node.all, ...node.none].map((check) => check.message) })) })), violations: axe.violations.map((rule) => ({ id: rule.id, impact: rule.impact, help: rule.help, nodes: rule.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })) }
                    result.exceptions = exceptions.splice(0)
                    if (result.layout.scrollWidth > profile.width + 1 || result.layout.mainCount !== 1 || result.layout.h1Count !== 1 || result.layout.duplicateReferencedIds.length || result.layout.clippedHeaderControls.length || result.layout.brokenImages.length || result.layout.reducedMotionAnimations || result.layout.untranslated || result.exceptions.length || result.axe.violations.length) report.failures.push(id)
                    if (profile.name === 'mobile-ru-dark' || profile.name === 'desktop-en-light') {
                        result.screenshot = `${id}.png`
                        await page.screenshot({ path: path.join(output, result.screenshot), fullPage: true, animations: 'disabled' })
                    }
                } catch (error) { result.error = error.message; report.failures.push(id) }
                report.results.push(result)
                await save()
                if (report.results.length % 10 === 0) console.info(`UI/UX ${report.results.length}/${report.plannedCases}; cases with findings: ${report.failures.length}`)
            }
            await context.close()
        }
    }
} finally {
    await browser.close()
    report.finishedAt = new Date().toISOString()
    await save()
}
console.info(`UI/UX audit finished: ${report.results.length}/${report.plannedCases}, ${report.failures.length} cases with findings. ${output}/report.json`)
if (report.failures.length) process.exitCode = 1
