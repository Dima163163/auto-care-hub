import { describe, expect, it } from 'vitest'

import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { AUTOCARE_MIN_BOOKING_LEAD_TIME_MS, canCreateAutoCareServiceQuote, canDecideAutoCareReschedule, isAutoCareServiceOfferExpired, isAutoCareVisitTimeBookable } from './request-lifecycle-policy.js'

describe('AutoCare request lifecycle policy', () => {
    it('only permits quotes while a request is still open to a new estimate', () => {
        expect(canCreateAutoCareServiceQuote(ServiceRequestStatus.Open)).toBe(true)
        expect(canCreateAutoCareServiceQuote(ServiceRequestStatus.EstimateShared)).toBe(true)
        expect(canCreateAutoCareServiceQuote(ServiceRequestStatus.Accepted)).toBe(false)
        expect(canCreateAutoCareServiceQuote(ServiceRequestStatus.Declined)).toBe(false)
        expect(canCreateAutoCareServiceQuote(ServiceRequestStatus.Cancelled)).toBe(false)
        expect(canCreateAutoCareServiceQuote(ServiceRequestStatus.NoShow)).toBe(false)
        expect(canCreateAutoCareServiceQuote(ServiceRequestStatus.Closed)).toBe(false)
    })

    it('only allows a reschedule decision for a live request and a future proposal', () => {
        const now = Date.parse('2026-09-24T10:00:00.000Z')
        const future = new Date(now + AUTOCARE_MIN_BOOKING_LEAD_TIME_MS)
        const tooSoon = new Date(now + 60_000)
        const past = new Date(now - 60_000)

        expect(canDecideAutoCareReschedule(ServiceRequestStatus.Accepted, future, now)).toBe(true)
        expect(canDecideAutoCareReschedule(ServiceRequestStatus.Cancelled, future, now)).toBe(false)
        expect(canDecideAutoCareReschedule(ServiceRequestStatus.NoShow, future, now)).toBe(false)
        expect(canDecideAutoCareReschedule(ServiceRequestStatus.Closed, future, now)).toBe(false)
        expect(canDecideAutoCareReschedule(ServiceRequestStatus.Accepted, past, now)).toBe(false)
        expect(canDecideAutoCareReschedule(ServiceRequestStatus.Accepted, tooSoon, now)).toBe(false)
        expect(canDecideAutoCareReschedule(ServiceRequestStatus.Accepted, new Date(Number.NaN), now)).toBe(false)
    })

    it('requires booking times to remain at least fifteen minutes in the future', () => {
        const now = Date.parse('2026-09-24T10:00:00.000Z')

        expect(isAutoCareVisitTimeBookable(new Date(now + AUTOCARE_MIN_BOOKING_LEAD_TIME_MS), now)).toBe(true)
        expect(isAutoCareVisitTimeBookable(new Date(now + AUTOCARE_MIN_BOOKING_LEAD_TIME_MS - 1), now)).toBe(false)
        expect(isAutoCareVisitTimeBookable(new Date(now), now)).toBe(false)
        expect(isAutoCareVisitTimeBookable(new Date(Number.NaN), now)).toBe(false)
    })

    it('fails closed for expired or malformed service offers', () => {
        const now = Date.parse('2026-09-24T10:00:00.000Z')

        expect(isAutoCareServiceOfferExpired(null, now)).toBe(false)
        expect(isAutoCareServiceOfferExpired('2026-09-24T10:01:00.000Z', now)).toBe(false)
        expect(isAutoCareServiceOfferExpired('2026-09-24T10:00:00.000Z', now)).toBe(true)
        expect(isAutoCareServiceOfferExpired('2026-09-24T09:59:00.000Z', now)).toBe(true)
        expect(isAutoCareServiceOfferExpired('invalid-date', now)).toBe(true)
    })
})
