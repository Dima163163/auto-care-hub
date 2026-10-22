import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ clientRefetch: vi.fn(), ownerRefetch: vi.fn() }))
vi.mock('../api/autocareApi', () => ({
    useGetMyAutoCareServiceRequestPageQuery: ({ cursor }: { cursor?: string }) => ({
        currentData: cursor
            ? { items: [{ id: 'older' }], nextCursor: null }
            : { items: [{ id: 'newer' }], nextCursor: 'next-page' },
        isLoading: false, isFetching: false, isError: false, error: null, refetch: mocks.clientRefetch,
    }),
    useGetOwnerAutoCareServiceRequestPageQuery: ({ cursor }: { cursor?: string }) => ({
        currentData: cursor
            ? { items: [{ id: 'owner-older' }], nextCursor: null }
            : { items: [{ id: 'owner-newer' }], nextCursor: 'next-page' },
        isLoading: false, isFetching: false, isError: false, error: null, refetch: mocks.ownerRefetch,
    }),
}))

import { useAutoCareRequestPages } from './useAutoCareRequestPages'

describe('request page hook', () => {
    it('loads older client requests on demand and preserves the first page', () => {
        const { result } = renderHook(() => useAutoCareRequestPages('client'))
        expect(result.current.data.map((item) => item.id)).toEqual(['newer'])
        expect(result.current.hasMore).toBe(true)

        act(() => result.current.loadMore())
        expect(result.current.data.map((item) => item.id)).toEqual(['newer', 'older'])
        expect(result.current.hasMore).toBe(false)
    })

    it('keeps owner pages separate from client pages', () => {
        const { result } = renderHook(() => useAutoCareRequestPages('owner'))
        expect(result.current.data.map((item) => item.id)).toEqual(['owner-newer'])
        act(() => result.current.loadMore())
        expect(result.current.data.map((item) => item.id)).toEqual(['owner-newer', 'owner-older'])
    })
})
