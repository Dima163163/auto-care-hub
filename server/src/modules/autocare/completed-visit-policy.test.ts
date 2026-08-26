import { describe, expect, it } from 'vitest'

import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { isVerifiedCompletedVisit } from './completed-visit-policy.js'

describe('verified completed visit policy', () => {
    const base = {
        status: ServiceRequestStatus.Closed,
        completedAt: new Date('2026-08-26T12:00:00Z'),
        clientConfirmedAt: new Date('2026-08-26T10:00:00Z'),
        providerConfirmedAt: new Date('2026-08-26T11:00:00Z'),
    }

    it('accepts a persisted visit closed after both confirmations', () => {
        expect(isVerifiedCompletedVisit(base)).toBe(true)
    })

    it('rejects a closed row without the durable completion timestamp', () => {
        expect(isVerifiedCompletedVisit({ ...base, completedAt: null })).toBe(false)
    })

    it('rejects a closed row without either party confirmation', () => {
        expect(isVerifiedCompletedVisit({ ...base, providerConfirmedAt: null })).toBe(false)
    })
})
