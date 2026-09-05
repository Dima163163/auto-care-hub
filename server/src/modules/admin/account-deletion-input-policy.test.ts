import { describe, expect, it } from 'vitest'

import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import {
    normalizeAccountDeletionRequestStatus,
    normalizeAccountDeletionRequestsQuery,
    normalizeAccountDeletionRequestUuid,
    normalizeAccountDeletionTerminalStatus,
} from './account-deletion-input-policy.js'

describe('Account deletion input policy', () => {
    it('normalizes status and pagination filters', () => {
        expect(normalizeAccountDeletionRequestsQuery({
            status: ' PENDING ',
            cursor: ' cursor-value ',
            limit: 20,
        })).toEqual({
            status: AccountDeletionRequestStatus.Pending,
            cursor: 'cursor-value',
            limit: 20,
        })
    })

    it('rejects unknown fields and malformed query values', () => {
        expect(normalizeAccountDeletionRequestsQuery(null)).toBeNull()
        expect(normalizeAccountDeletionRequestsQuery({ extra: true })).toBeNull()
        expect(normalizeAccountDeletionRequestsQuery({ status: 'unknown' })).toBeNull()
        expect(normalizeAccountDeletionRequestsQuery({ limit: 101 })).toBeNull()
        expect(normalizeAccountDeletionRequestsQuery({ cursor: 'x'.repeat(513) })).toBeNull()
    })

    it('canonicalizes UUIDs and restricts terminal statuses', () => {
        const requestId = '550e8400-e29b-41d4-a716-446655440000'
        expect(normalizeAccountDeletionRequestUuid(` ${requestId.toUpperCase()} `)).toBe(requestId)
        expect(normalizeAccountDeletionRequestUuid('request-1')).toBeNull()
        expect(normalizeAccountDeletionRequestStatus(' COMPLETED ')).toBe(AccountDeletionRequestStatus.Completed)
        expect(normalizeAccountDeletionTerminalStatus(' CANCELLED ')).toBe(AccountDeletionRequestStatus.Cancelled)
        expect(normalizeAccountDeletionTerminalStatus('pending')).toBeNull()
    })

    it('accepts the undefined default but rejects null', () => {
        expect(normalizeAccountDeletionRequestsQuery(undefined)).toEqual({})
        expect(normalizeAccountDeletionRequestsQuery(null)).toBeNull()
    })
})
