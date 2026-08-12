import { describe, expect, it } from 'vitest'

import { getAccountDeletionAdminAuditMetadata } from './account-deletion-audit.js'

describe('account deletion audit metadata', () => {
    it('keeps the request correlation id with the terminal action', () => {
        expect(getAccountDeletionAdminAuditMetadata({ requestId: 'request-1', status: 'completed' })).toEqual({
            requestId: 'request-1',
            status: 'completed',
            operation: 'admin_account_deletion_status_update',
        })
    })
})
