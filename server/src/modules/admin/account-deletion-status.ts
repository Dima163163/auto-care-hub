import { AccountDeletionRequestStatus } from '../../entities/account-deletion-request/account-deletion-request.entity.js'

export type AccountDeletionTerminalStatus =
    | AccountDeletionRequestStatus.Cancelled
    | AccountDeletionRequestStatus.Completed

export function isAccountDeletionStatusTransitionAllowed(
    current: AccountDeletionRequestStatus,
    target: AccountDeletionTerminalStatus,
) {
    return current === target || current === AccountDeletionRequestStatus.Pending
}
