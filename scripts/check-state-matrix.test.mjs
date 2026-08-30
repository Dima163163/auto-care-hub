import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateStateMatrix } from './check-state-matrix.mjs'

const sourceMap = {
    clientStates: [
        "scenario: 'error' | 'stale' | 'offline' | 'permission-denied' | 'suspended'",
        "for (const scenario of ['error', 'stale', 'offline', 'permission-denied', 'suspended'] as const)",
        'test(`uses a recoverable ${scenario} state',
        "useReviewFixture(page, 'empty')",
        "useReviewFixture(page, 'one')",
        "useReviewFixture(page, 'photos')",
        'service-request-attachment-input',
        'service-request-attachment',
        "providerId: 'api-proservice-moscow'",
        "providerId: 'api-autolux-moscow'",
        "providerId: 'api-formula-moscow'",
        "for (const mode of ['online', 'request_then_confirm', 'phone_only'] as const)",
        'page.setViewportSize({ width: 390, height: 844 })',
        'document.documentElement.scrollWidth <= window.innerWidth + 1',
        "page.goto('/profile/bookings')",
    ].join('\n'),
    realStates: [
        "type InjectedRequestState = 'error' | 'offline' | 'permission-denied' | 'stale' | 'suspended'",
        'expireAuthenticatedSession',
        'injectPartialDiscovery',
        'injectRealStaleAfterDiscoveryCacheFill',
        "for (const state of ['error', 'offline', 'permission-denied', 'stale', 'suspended'] as const)",
        "mode === 'online'",
        "mode === 'request_then_confirm'",
        "mode === 'phone_only'",
        'failNextRequestSubmission',
        "['offline', 'timeout'] as const",
        'without losing the idempotency key',
        'real API keeps a repeated request idempotent in PostgreSQL',
        'persistedCount',
    ].join('\n'),
}

test('state matrix contract passes for all required browser scenarios', () => {
    const results = evaluateStateMatrix(sourceMap)
    assert.equal(results.filter((result) => result.status === 'blocked').length, 0)
})

test('state matrix contract reports the exact missing scenario', () => {
    const results = evaluateStateMatrix({ ...sourceMap, realStates: sourceMap.realStates.replace('expireAuthenticatedSession', '') })
    const realStates = results.find((result) => result.name === 'Real recoverable states')
    assert.equal(realStates?.status, 'blocked')
    assert.match(realStates?.detail ?? '', /expireAuthenticatedSession/)
})
