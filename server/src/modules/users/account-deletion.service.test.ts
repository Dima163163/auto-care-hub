import { describe, expect, it } from 'vitest'

import { isPendingDeletionUniqueViolation } from './account-deletion.service.js'

describe('isPendingDeletionUniqueViolation', () => {
    it('recognizes the pending deletion partial unique index', () => {
        expect(isPendingDeletionUniqueViolation({
            driverError: {
                code: '23505',
                constraint: 'UQ_account_deletion_requests_pending_user',
            },
        })).toBe(true)
    })

    it('recognizes a direct postgres error shape', () => {
        expect(isPendingDeletionUniqueViolation({ code: '23505' })).toBe(true)
    })

    it('does not swallow unrelated database errors', () => {
        expect(isPendingDeletionUniqueViolation({ code: '23505', constraint: 'other_unique_index' })).toBe(false)
        expect(isPendingDeletionUniqueViolation({ code: '23503' })).toBe(false)
        expect(isPendingDeletionUniqueViolation(new Error('conflict'))).toBe(false)
    })
})
