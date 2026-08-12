import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const routes = ['/cabinets', '/cabinets/cabinet-1', '/help'] as const
const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 900 },
] as const

async function prepare(page: Page) {
    await page.addInitScript(() => {
        window.localStorage.setItem('autocare-hub-locale', 'en')
        window.localStorage.setItem('autocare-hub-theme', 'light')
    })
}

for (const viewport of viewports) {
    for (const route of routes) {
        test(`${viewport.name} ${route} passes visual preflight`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            await prepare(page)
            await page.goto(route)
            await expect(page.locator('main h1:visible').first()).toBeVisible()

            const structure = await page.evaluate(() => {
                const visible = (element: Element) => {
                    const bounds = element.getBoundingClientRect()
                    const style = window.getComputedStyle(element)
                    return bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden'
                }

                const visibleHeadings = [...document.querySelectorAll('main h1')].filter(visible)
                const visibleMains = [...document.querySelectorAll('main')].filter(visible)
                const bodyText = document.body.innerText
                const fixedNavigation = [...document.querySelectorAll('nav')]
                    .find((element) => visible(element) && window.getComputedStyle(element).position === 'fixed')

                return {
                    hasDuplicateMain: visibleMains.length !== 1,
                    hasDuplicateHeading: visibleHeadings.length !== 1,
                    hasPlaceholder: /\b(?:TODO|FIXME|Lorem ipsum|Coming soon)\b/i.test(bodyText),
                    hasRawTranslationKey: /(?:^|\s)(?:landing|navigation|common|errors)\.[A-Za-z0-9_.-]+/.test(bodyText),
                    hasUndefinedText: /\b(?:undefined|null)\b/i.test(bodyText),
                    navigation: fixedNavigation
                        ? {
                            bottom: fixedNavigation.getBoundingClientRect().bottom,
                            top: fixedNavigation.getBoundingClientRect().top,
                            height: fixedNavigation.getBoundingClientRect().height,
                        }
                        : null,
                    shellPaddingBottom: (() => {
                        const shell = document.querySelector('.mobile-bottom-safe, .mobile-admin-bottom-safe')
                        return shell ? Number.parseFloat(window.getComputedStyle(shell).paddingBottom) : null
                    })(),
                    scrollPaddingBottom: Number.parseFloat(
                        window.getComputedStyle(document.documentElement).scrollPaddingBottom,
                    ),
                }
            })

            expect(structure.hasDuplicateMain).toBe(false)
            expect(structure.hasDuplicateHeading).toBe(false)
            expect(structure.hasPlaceholder).toBe(false)
            expect(structure.hasRawTranslationKey).toBe(false)
            expect(structure.hasUndefinedText).toBe(false)

            if (viewport.width < 768) {
                expect(structure.scrollPaddingBottom).toBeGreaterThanOrEqual(72)
            }

            await expect.poll(() => page.evaluate(() => [...document.images]
                .filter((image) => {
                    const bounds = image.getBoundingClientRect()
                    const inViewport = bounds.bottom > 0 && bounds.top < window.innerHeight
                        && bounds.right > 0 && bounds.left < window.innerWidth
                    return bounds.width > 0 && bounds.height > 0 && inViewport
                        && !image.closest('.leaflet-container')
                })
                .every((image) => image.complete && image.naturalWidth > 0 && (
                    image.dataset.imageState === undefined || image.dataset.imageState === 'loaded'
                )))).toBe(true)

            if (structure.navigation) {
                expect(structure.navigation.bottom).toBeCloseTo(viewport.height, 0)
                if (viewport.width < 768 && structure.shellPaddingBottom !== null) {
                    expect(structure.shellPaddingBottom).toBeGreaterThanOrEqual(structure.navigation.height - 1)
                }
                const lastAction = page.locator('main a:visible, main button:visible').last()
                await lastAction.scrollIntoViewIfNeeded()
                const overlap = await lastAction.evaluate((element) => {
                    const fixedNavigation = [...document.querySelectorAll('nav')]
                        .find((candidate) => window.getComputedStyle(candidate).position === 'fixed')
                    if (!fixedNavigation) return false
                    return element.getBoundingClientRect().bottom > fixedNavigation.getBoundingClientRect().top
                })
                expect(overlap).toBe(false)
            }

            const accessibility = await new AxeBuilder({ page }).analyze()
            expect(accessibility.violations, `${viewport.name} ${route}`).toEqual([])
        })
    }
}
