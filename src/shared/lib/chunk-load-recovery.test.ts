import { describe, expect, it, vi } from 'vitest'

import { recoverFromPreloadError } from './chunk-load-recovery'

function createStorage(value: string | null = null) {
    let currentValue = value

    return {
        getItem: vi.fn(() => currentValue),
        setItem: vi.fn((_key: string, nextValue: string) => {
            currentValue = nextValue
        }),
        removeItem: vi.fn(),
    }
}

describe('recoverFromPreloadError', () => {
    it('reloads once when no recent recovery attempt exists', () => {
        const storage = createStorage()
        const reload = vi.fn()

        expect(recoverFromPreloadError({ storage, reload, now: 1000 })).toBe(true)
        expect(storage.setItem).toHaveBeenCalledWith('autocare-hub-chunk-recovery-at', '1000')
        expect(reload).toHaveBeenCalledOnce()
    })

    it('does not loop while a recent recovery attempt is active', () => {
        const storage = createStorage('1000')
        const reload = vi.fn()

        expect(recoverFromPreloadError({ storage, reload, now: 1000 + 29_999 })).toBe(false)
        expect(storage.setItem).not.toHaveBeenCalled()
        expect(reload).not.toHaveBeenCalled()
    })

    it('allows a later recovery after the cooldown expires', () => {
        const storage = createStorage('1000')
        const reload = vi.fn()

        expect(recoverFromPreloadError({ storage, reload, now: 31_000 })).toBe(true)
        expect(reload).toHaveBeenCalledOnce()
    })
})
