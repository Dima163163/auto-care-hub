import { describe, expect, it } from 'vitest'

import {
    accountAnonymizationPolicy,
    ANONYMIZED_REVIEW_TEXT,
    getAnonymizedIdentity,
} from './account-anonymization-policy.js'

describe('account anonymization policy', () => {
    it('keeps financial evidence and business context immutable', () => {
        expect(accountAnonymizationPolicy.bookings.businessAndFinancialReferences).toBe('preserve')
        expect(accountAnonymizationPolicy.reviews.ratingStatusAndTimestamps).toBe('preserve')
    })

    it('redacts identity and free-text fields without deleting the ledger', () => {
        expect(accountAnonymizationPolicy.user.identity).toBe('redact')
        expect(accountAnonymizationPolicy.bookings.freeText).toBe('redact')
        expect(accountAnonymizationPolicy.reviews.text).toBe('redact')
        expect(ANONYMIZED_REVIEW_TEXT.length).toBeGreaterThanOrEqual(10)
    })

    it('defines financial-record-safe actions for every retained family', () => {
        expect(accountAnonymizationPolicy.financialRecords.completedBooking).toEqual({
            businessReferences: 'preserve',
            clientReference: 'preserve_through_booking',
            freeText: 'redact',
        })
        expect(accountAnonymizationPolicy.financialRecords.review.text).toBe('redact')
        expect(accountAnonymizationPolicy.financialRecords.review.ratingStatusAndTimestamps).toBe('preserve')
    })

    it('generates a deterministic reserved email for idempotent reruns', () => {
        const first = getAnonymizedIdentity('user-123')
        const second = getAnonymizedIdentity('user-123')

        expect(first).toEqual(second)
        expect(first.email).toBe('deleted+user-123@example.invalid')
    })
})
