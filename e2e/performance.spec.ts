import { expect, test } from '@playwright/test'

test.describe('representative runtime performance budgets', () => {
    test('public catalog keeps image and interaction work bounded', async ({ page }) => {
        await page.goto('/cabinets')
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
        await page.waitForLoadState('networkidle')

        const imageMetrics = await page.evaluate(() => [...document.images]
            .filter((image) => {
                const bounds = image.getBoundingClientRect()
                return bounds.width > 0 && bounds.height > 0 && !image.closest('.leaflet-container')
            })
            .map((image) => ({
                decoding: image.decoding,
                loading: image.loading,
            })))

        expect(imageMetrics.length).toBeLessThanOrEqual(20)
        expect(imageMetrics.every((image) => image.loading === 'lazy')).toBe(true)
        expect(imageMetrics.every((image) => image.decoding === 'async')).toBe(true)

        const longTaskDuration = await page.evaluate(() => performance
            .getEntriesByType('longtask')
            .reduce((total, entry) => total + entry.duration, 0))
        expect(longTaskDuration).toBeLessThan(500)

        const inputFrameLatency = await page.evaluate(() => {
            const input = document.querySelector('input[aria-label]')

            if (!(input instanceof HTMLInputElement)) {
                throw new Error('Expected an accessible catalog input.')
            }

            input.focus()
            input.value = `${input.value}x`
            const start = performance.now()
            input.dispatchEvent(new Event('input', { bubbles: true }))

            return new Promise<number>((resolve) => {
                requestAnimationFrame(() => resolve(performance.now() - start))
            })
        })

        expect(inputFrameLatency).toBeLessThan(250)
    })
})
