import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus', () => {
    afterEach(() => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        })
    })

    it('tracks browser offline and online events', () => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        })

        const { result } = renderHook(() => useOnlineStatus())

        act(() => window.dispatchEvent(new Event('offline')))
        expect(result.current).toBe(false)

        act(() => window.dispatchEvent(new Event('online')))
        expect(result.current).toBe(true)
    })
})
