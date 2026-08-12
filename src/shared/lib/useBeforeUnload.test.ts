import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useBeforeUnload } from './useBeforeUnload'

describe('useBeforeUnload', () => {
    it('prevents browser unload while enabled', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
        renderHook(() => useBeforeUnload(true))

        const beforeUnloadCall = addEventListenerSpy.mock.calls.find(
            ([eventName]) => eventName === 'beforeunload',
        )
        const handleBeforeUnload = beforeUnloadCall?.[1]
        const event = {
            preventDefault: vi.fn(),
            returnValue: 'initial',
        } as unknown as BeforeUnloadEvent

        act(() => {
            if (typeof handleBeforeUnload === 'function') {
                handleBeforeUnload(event)
            }
        })

        expect(event.preventDefault).toHaveBeenCalledOnce()
        expect(event.returnValue).toBe('')
        addEventListenerSpy.mockRestore()
    })

    it('removes the browser guard when disabled', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
        const { rerender } = renderHook(
            ({ enabled }) => useBeforeUnload(enabled),
            { initialProps: { enabled: true } },
        )

        rerender({ enabled: false })

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
            'beforeunload',
            expect.any(Function),
        )
        removeEventListenerSpy.mockRestore()
    })
})
