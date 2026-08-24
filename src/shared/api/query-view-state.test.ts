import { describe, expect, it } from 'vitest'

import { resolveQueryViewState, type QueryViewStateInput } from './query-view-state'

const baseState: QueryViewStateInput = {
    isLoading: false,
    isFetching: false,
    isError: false,
    hasData: true,
    hasResults: true,
}

describe('resolveQueryViewState', () => {
    it.each([
        ['initial loading', { isLoading: true, hasData: false, hasResults: false }, 'loading'],
        ['background request without data', { isFetching: true, hasData: false, hasResults: false }, 'loading'],
        ['empty response', { hasResults: false }, 'empty'],
        ['successful response', {}, 'success'],
        ['background refresh', { isFetching: true }, 'refreshing'],
        ['hard error', { isError: true, hasData: false, hasResults: false }, 'error'],
        ['stale-data error', { isError: true }, 'stale-error'],
        ['offline without cached data', { isOffline: true, hasData: false, hasResults: false }, 'offline'],
        ['offline with cached data keeps the data state', { isOffline: true }, 'success'],
        ['permission denied takes priority over retryable errors', { isPermissionDenied: true, isError: true }, 'permission-denied'],
        ['suspended takes priority over a retryable error', { isSuspended: true, isError: true }, 'suspended'],
        ['stale response keeps cached data visible', { isStale: true }, 'stale-error'],
    ])('%s', (_label, overrides, expected) => {
        expect(resolveQueryViewState({ ...baseState, ...overrides })).toBe(expected)
    })
})
