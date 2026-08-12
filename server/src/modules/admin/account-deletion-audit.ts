export function getAccountDeletionAdminAuditMetadata(input: {
    requestId: string
    status: 'cancelled' | 'completed'
}) {
    return {
        requestId: input.requestId,
        status: input.status,
        operation: 'admin_account_deletion_status_update',
    }
}
