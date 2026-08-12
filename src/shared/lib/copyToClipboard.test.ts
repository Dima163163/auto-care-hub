import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyToClipboard } from './copyToClipboard'

describe('copyToClipboard', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('copies a value when Clipboard API is available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { clipboard: { writeText } })

        await expect(copyToClipboard('request-123')).resolves.toBe(true)
        expect(writeText).toHaveBeenCalledWith('request-123')
    })

    it('returns false when the browser cannot write to the clipboard', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('denied'))
        vi.stubGlobal('navigator', { clipboard: { writeText } })

        await expect(copyToClipboard('request-123')).resolves.toBe(false)
    })

    it('returns false when Clipboard API is unavailable', async () => {
        vi.stubGlobal('navigator', {})

        await expect(copyToClipboard('request-123')).resolves.toBe(false)
    })
})
