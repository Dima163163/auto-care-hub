import { describe, expect, it } from 'vitest'

import {
    normalizeOwnerReadiness,
} from './payment-response-schema'

describe('payment response schemas', () => {
    it('normalizes bounded owner readiness and rejects unknown blockers', () => {
        expect(normalizeOwnerReadiness({
            ready: false,
            blockers: ['schedule'],
            checks: {
                emailVerified: true,
                activeCabinet: true,
                activeService: true,
                scheduleConfigured: false,
                payoutAccount: 'ready',
            },
        }).checks.scheduleConfigured).toBe(false)

        expect(() => normalizeOwnerReadiness({
            ready: false,
            blockers: ['provider_secret'],
            checks: {
                emailVerified: true,
                activeCabinet: true,
                activeService: true,
                scheduleConfigured: true,
                payoutAccount: 'ready',
            },
        })).toThrow()
    })
})
