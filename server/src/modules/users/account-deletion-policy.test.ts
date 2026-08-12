import { describe, expect, it } from 'vitest'

import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { getAccountDeletionDecision } from './account-deletion-policy.js'

describe('account deletion state policy', () => {
    it('maps persisted lifecycle statuses to safe decisions', () => {
        expect(getAccountDeletionDecision(AccountDeletionRequestStatus.Pending)).toBe('pending')
        expect(getAccountDeletionDecision(AccountDeletionRequestStatus.Completed)).toBe('completed')
        expect(getAccountDeletionDecision('unexpected')).toBe('unknown')
    })
})
