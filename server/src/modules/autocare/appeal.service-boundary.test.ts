import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { UserRole } from '../../entities/user/user.entity.js'
import {
    createAutoCareAppeal,
    decideAdminAutoCareAppeal,
    getPendingAutoCareAppealCount,
    listAdminAutoCareAppeals,
    withdrawAutoCareAppeal,
} from './appeal.service.js'

const admin = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Admin } as never
const client = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Client } as never

describe('AutoCare appeal service boundaries', () => {
    beforeEach(() => {
        mocks.transaction.mockReset()
    })

    it('rejects malformed create payloads and references before repository access', async () => {
        await expect(createAutoCareAppeal(client, null)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareAppeal(client, {
            subject: 'provider',
            subjectId: 'not-a-uuid',
            reason: 'This appeal reason is sufficiently detailed for validation.',
        })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed withdrawal ids before opening a transaction', async () => {
        await expect(withdrawAutoCareAppeal(client, 'not-a-uuid')).rejects.toMatchObject({ statusCode: 422 })
    })

    it('bounds admin list queries before repository access', async () => {
        await expect(listAdminAutoCareAppeals(admin, { limit: 101 })).rejects.toMatchObject({ statusCode: 422 })
        await expect(listAdminAutoCareAppeals(admin, { status: 'unknown' })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('keeps admin authorization ahead of decision input validation', async () => {
        await expect(decideAdminAutoCareAppeal(client, 'not-a-uuid', null)).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAdminAutoCareAppeal(admin, 'not-a-uuid', null)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects an administrator deciding their own chat-restriction appeal before revoking the block', async () => {
        const appealId = '33333333-3333-4333-8333-333333333333'
        const repository = {
            findOne: vi.fn().mockResolvedValue({ id: appealId, submittedById: admin.id, status: 'pending', subject: 'chat_restriction' }),
            save: vi.fn(),
        }
        const manager = { getRepository: vi.fn().mockReturnValue(repository) }
        mocks.transaction.mockImplementation(async (run) => run(manager))

        await expect(decideAdminAutoCareAppeal(admin, appealId, { status: 'accepted', reason: 'Review completed.' }))
            .rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' })
        expect(repository.findOne).toHaveBeenCalledWith({ where: { id: appealId }, lock: { mode: 'pessimistic_write' } })
        expect(manager.getRepository).toHaveBeenCalledTimes(1)
        expect(repository.save).not.toHaveBeenCalled()
    })

    it('keeps admin authorization ahead of pending-count repository access', async () => {
        await expect(getPendingAutoCareAppealCount(client)).rejects.toMatchObject({ statusCode: 403 })
    })
})
