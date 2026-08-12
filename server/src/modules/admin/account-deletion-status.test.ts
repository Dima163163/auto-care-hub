import { describe, expect, it } from 'vitest'

import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { isAccountDeletionStatusTransitionAllowed } from './account-deletion-status.js'

describe('account deletion status transitions', () => {
    it('allows idempotent terminal updates and pending terminal transitions', () => {
        expect(isAccountDeletionStatusTransitionAllowed(AccountDeletionRequestStatus.Pending, AccountDeletionRequestStatus.Cancelled)).toBe(true)
        expect(isAccountDeletionStatusTransitionAllowed(AccountDeletionRequestStatus.Pending, AccountDeletionRequestStatus.Completed)).toBe(true)
        expect(isAccountDeletionStatusTransitionAllowed(AccountDeletionRequestStatus.Cancelled, AccountDeletionRequestStatus.Cancelled)).toBe(true)
    })

    it('rejects changing one terminal status into another', () => {
        expect(isAccountDeletionStatusTransitionAllowed(AccountDeletionRequestStatus.Cancelled, AccountDeletionRequestStatus.Completed)).toBe(false)
        expect(isAccountDeletionStatusTransitionAllowed(AccountDeletionRequestStatus.Completed, AccountDeletionRequestStatus.Cancelled)).toBe(false)
    })
})
