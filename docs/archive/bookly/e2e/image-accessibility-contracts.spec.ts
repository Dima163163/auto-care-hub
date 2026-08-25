import { expect, test, type Page } from '@playwright/test'

const imageRoutes = [
    { path: '/cabinets', minimumImages: 1 },
    { path: '/cabinets/cabinet-1', minimumImages: 1 },
] as const

async function waitForVisibleImages(page: Page) {
    await expect.poll(() => page.evaluate(() => [...document.images]
        .filter((image) => {
            const bounds = image.getBoundingClientRect()
            return bounds.width > 0
                && bounds.height > 0
                && bounds.top < window.innerHeight
                && bounds.bottom > 0
                && !image.closest('.leaflet-container')
        })
        .every((image) => image.complete && image.naturalWidth > 0 && (
            image.dataset.imageState === undefined || image.dataset.imageState === 'loaded'
        )))).toBe(true)
}

test.describe('inspectable image contracts', () => {
    for (const { path, minimumImages } of imageRoutes) {
        test(`${path} exposes loaded, dimensioned, labelled imagery`, async ({ page }) => {
            await page.addInitScript(() => {
                window.localStorage.setItem('autocare-hub-locale', 'en')
                window.localStorage.setItem('autocare-hub-theme', 'light')
            })
            await page.goto(path)
            await expect(page.locator('main h1:visible').first()).toBeVisible()
            const firstContentImage = page.locator('main img').first()
            if (await firstContentImage.count() > 0) {
                await firstContentImage.scrollIntoViewIfNeeded()
            }
            await waitForVisibleImages(page)

            const images = await page.evaluate(() => [...document.images]
                .filter((image) => {
                    const bounds = image.getBoundingClientRect()
                    return bounds.width > 0
                        && bounds.height > 0
                        && bounds.top < window.innerHeight
                        && bounds.bottom > 0
                        && !image.closest('.leaflet-container')
                })
                .map((image) => ({
                    alt: image.alt.trim(),
                    height: Number(image.getAttribute('height')),
                    state: image.dataset.imageState,
                    src: image.currentSrc || image.src,
                    width: Number(image.getAttribute('width')),
                })))

            expect(images.length).toBeGreaterThanOrEqual(minimumImages)
            expect(images.every((image) => image.alt.length > 0)).toBe(true)
            expect(images.every((image) => image.width > 0 && image.height > 0)).toBe(true)
            expect(images.every((image) => image.state === undefined || image.state === 'loaded')).toBe(true)
            expect(images.every((image) => !/^javascript:|^data:/i.test(image.src))).toBe(true)
        })
    }
})
