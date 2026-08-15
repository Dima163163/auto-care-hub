import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import { UserRole } from '../../entities/user/user.entity.js'
import { assertOwnerBroadcastAccess } from './autocare-marketplace.service.js'

describe('AutoCare broadcast ownership', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
    })

    it('does not let an unrelated owner inspect a client broadcast', async () => {
        mocks.getRepository.mockReturnValue({
            find: vi.fn().mockResolvedValue([]),
        })

        await expect(assertOwnerBroadcastAccess(
            { id: 'owner-2', role: UserRole.Owner } as never,
            {
                id: 'broadcast-1',
                clientId: 'client-1',
                serviceDefinitionId: 'definition-1',
                status: 'open',
                expiresAt: new Date(Date.now() + 60_000),
            } as never,
        )).rejects.toMatchObject({ statusCode: 403 })
    })

    it('allows the broadcast owner without provider lookups', async () => {
        await expect(assertOwnerBroadcastAccess(
            { id: 'client-1', role: UserRole.Client } as never,
            { id: 'broadcast-1', clientId: 'client-1' } as never,
        )).resolves.toBeUndefined()
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })
})
