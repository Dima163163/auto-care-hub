import { describe, expect, it } from 'vitest'

import { AutoCareQuoteStatus } from '../../entities/automotive/service-quote.entity.js'
import { getAutoCareQuoteLifecycleStatus, isAutoCareQuoteExpired } from './quote-policy.js'

describe('AutoCare quote lifecycle policy', () => {
    const now = new Date('2026-08-26T12:00:00.000Z')

    it('expires a pending quote at the exact deadline', () => {
        expect(isAutoCareQuoteExpired('2026-08-26T12:00:00.000Z', now)).toBe(true)
        expect(getAutoCareQuoteLifecycleStatus(
            AutoCareQuoteStatus.Pending,
            '2026-08-26T12:00:00.000Z',
            now,
        )).toBe(AutoCareQuoteStatus.Expired)
    })

    it('does not rewrite terminal quote statuses', () => {
        expect(getAutoCareQuoteLifecycleStatus(
            AutoCareQuoteStatus.Accepted,
            '2020-01-01T00:00:00.000Z',
            now,
        )).toBe(AutoCareQuoteStatus.Accepted)
        expect(getAutoCareQuoteLifecycleStatus(
            AutoCareQuoteStatus.Superseded,
            '2020-01-01T00:00:00.000Z',
            now,
        )).toBe(AutoCareQuoteStatus.Superseded)
    })

    it('keeps quotes without an expiry open', () => {
        expect(isAutoCareQuoteExpired(null, now)).toBe(false)
        expect(getAutoCareQuoteLifecycleStatus(
            AutoCareQuoteStatus.Pending,
            null,
            now,
        )).toBe(AutoCareQuoteStatus.Pending)
    })
})
