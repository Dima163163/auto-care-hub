import { describe, expect, it, vi } from 'vitest'

const transaction = vi.hoisted(() => vi.fn())
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { transaction } }))

import { resetPrivilegedMfa } from './privileged-mfa.service.js'

describe('privileged MFA recovery approval boundary', () => {
    it('rejects self-approval, duplicate approvers and unbounded ticket IDs before DB mutation', async () => {
        const targetUserId = 'target'
        const approvals = [
            { userId: 'first', code: '123456' },
            { userId: 'second', code: '654321' },
        ] as const
        await expect(resetPrivilegedMfa({ targetUserId, approvals, ticketId: 'bad ticket\ncode' }))
            .rejects.toThrow('ticket ID')
        await expect(resetPrivilegedMfa({
            targetUserId,
            approvals: [approvals[0], approvals[0]],
            ticketId: 'RESET-123',
        })).rejects.toThrow('distinct')
        await expect(resetPrivilegedMfa({
            targetUserId,
            approvals: [{ userId: targetUserId, code: '123456' }, approvals[1]],
            ticketId: 'RESET-123',
        })).rejects.toThrow('other than the target')
        expect(transaction).not.toHaveBeenCalled()
    })
})
