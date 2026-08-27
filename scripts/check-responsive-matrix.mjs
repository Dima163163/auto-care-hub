import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'

const baseUrl = process.env.RESPONSIVE_BASE_URL ?? 'http://127.0.0.1:4175'
const widths = [360, 390, 414, 540, 682, 768, 790, 1024, 1280, 1440]
const routes = [
    { name: 'home', path: '/', required: ['header', 'footer'] },
    { name: 'services', path: '/services?service=oil-change', required: ['header', 'footer', 'map'] },
    // The mock API exposes provider records with the public `api-` prefix.
    // Keep this as a real user-facing URL so the check covers the same path
    // used by result cards and direct navigation.
    { name: 'provider', path: '/services/api-proservice-moscow', required: ['header', 'footer', 'gallery'] },
]

const chromiumCandidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    chromium.executablePath(),
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((candidate) => typeof candidate === 'string' && candidate.length > 0)

const chromiumPath = chromiumCandidates.find((candidate) => existsSync(candidate))

if (!chromiumPath) {
    throw new Error('No Chromium-compatible executable found. Run npm run check:e2e:browser for installation guidance.')
}

const browser = await chromium.launch({ headless: true, executablePath: chromiumPath })
const results = []
const failures = []

try {
    for (const width of widths) {
        for (const route of routes) {
            const page = await browser.newPage({ viewport: { width, height: width <= 540 ? 844 : 900 } })
            const url = `${baseUrl}${route.path}`
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
                // NextClientApp renders a stable shell immediately and resolves
                // translations/MSW before mounting the route. Wait for the shell
                // marker instead of taking a timing-sensitive screenshot of it.
                await page.waitForFunction(
                    () => !document.querySelector('[aria-busy="true"][aria-label*="Loading"]'),
                    undefined,
                    { timeout: 15_000 },
                )
                // Data-backed sections mount after the shell. Give the route a
                // bounded window to settle so a slow first request is not
                // misreported as a layout failure.
                await page.waitForFunction((routeName) => {
                    if (routeName === 'services') return Boolean(document.querySelector('#comparison-map'))
                    if (routeName === 'provider') return Boolean(document.querySelector('[data-testid="provider-gallery"]'))
                    return true
                }, route.name, { timeout: 10_000 }).catch(() => undefined)
                await page.waitForTimeout(250)

                const state = await page.evaluate(() => {
                    const isVisible = (selector) => {
                        return Array.from(document.querySelectorAll(selector)).some((element) => {
                            if (!(element instanceof HTMLElement)) return false
                            const style = window.getComputedStyle(element)
                            const rect = element.getBoundingClientRect()
                            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
                        })
                    }

                    return ({
                    url: window.location.href,
                    viewport: window.innerWidth,
                    scrollWidth: document.documentElement.scrollWidth,
                    bodyWidth: document.body.scrollWidth,
                    header: Boolean(document.querySelector('header')),
                    footer: Boolean(document.querySelector('footer')),
                    map: Boolean(document.querySelector('#comparison-map')),
                    gallery: Boolean(document.querySelector('[data-testid="provider-gallery"]')),
                    mobileMenu: isVisible('[data-testid="mobile-home-menu"], [data-testid="desktop-public-mobile-menu-trigger"], button[aria-controls*="mobile-menu"]'),
                })
                })

                const checks = {
                    noHorizontalOverflow: state.scrollWidth <= state.viewport + 1 && state.bodyWidth <= state.viewport + 1,
                    headerVisible: state.header,
                    footerVisible: state.footer,
                    requiredContent: route.required.every((item) => state[item]),
                    mobileNavigation: width <= 1120 ? state.mobileMenu : !state.mobileMenu,
                }

                for (const [check, passed] of Object.entries(checks)) {
                    if (!passed) failures.push({ width, route: route.name, check, state })
                }

                if (route.name === 'provider' && state.gallery) {
                    const gallery = page.getByTestId('provider-gallery')
                    await gallery.click()
                    const dialogVisible = await page.getByRole('dialog').isVisible().catch(() => false)
                    if (!dialogVisible) failures.push({ width, route: route.name, check: 'gallery-opens' })
                    if (dialogVisible) {
                        await page.keyboard.press('Escape')
                        const closed = !(await page.getByRole('dialog').isVisible().catch(() => false))
                        if (!closed) failures.push({ width, route: route.name, check: 'gallery-closes-with-escape' })
                    }
                }

                results.push({ width, route: route.name, ...checks, scrollWidth: state.scrollWidth })
            } catch (error) {
                failures.push({ width, route: route.name, check: 'navigation', message: error instanceof Error ? error.message : String(error) })
            } finally {
                await page.close()
            }
        }
    }
} finally {
    await browser.close()
}

await mkdir('output/playwright', { recursive: true })
await writeFile('output/playwright/responsive-matrix.json', JSON.stringify({ baseUrl, widths, results, failures }, null, 2))

console.info(`Responsive matrix: ${results.length} route/width checks`)
console.info(`Widths: ${widths.join(', ')}`)
console.info(`Failures: ${failures.length}`)
if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2))
    process.exitCode = 1
}
