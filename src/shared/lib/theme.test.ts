import { describe, expect, it, vi } from 'vitest'

import {
    applyTheme,
    getInitialTheme,
    isTheme,
} from '@/shared/lib/theme'

describe('theme helpers', () => {
    it('recognizes supported persisted themes', () => {
        expect(isTheme('light')).toBe(true)
        expect(isTheme('dark')).toBe(true)
        expect(isTheme('system')).toBe(false)
        expect(isTheme(null)).toBe(false)
    })

    it('prefers a persisted theme over the system preference', () => {
        expect(getInitialTheme('light', true)).toBe('light')
        expect(getInitialTheme('dark', false)).toBe('dark')
    })

    it('falls back to the system preference', () => {
        expect(getInitialTheme(null, true)).toBe('dark')
        expect(getInitialTheme(null, false)).toBe('light')
    })

    it('applies the theme class, attribute and color scheme', () => {
        const toggle = vi.fn()
        const root = {
            classList: { toggle },
            style: { colorScheme: '' },
            dataset: {},
        } as unknown as HTMLElement

        applyTheme(root, 'dark')

        expect(toggle).toHaveBeenCalledWith('dark', true)
        expect(root.dataset.theme).toBe('dark')
        expect(root.style.colorScheme).toBe('dark')
    })
})
