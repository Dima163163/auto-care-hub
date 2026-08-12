import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'

export type AccountDeletionDecision = 'pending' | 'cancelled' | 'completed' | 'unknown'

export function getAccountDeletionDecision(status: string): AccountDeletionDecision {
    if (status === AccountDeletionRequestStatus.Pending) return 'pending'
    if (status === AccountDeletionRequestStatus.Cancelled) return 'cancelled'
    if (status === AccountDeletionRequestStatus.Completed) return 'completed'
    return 'unknown'
}
