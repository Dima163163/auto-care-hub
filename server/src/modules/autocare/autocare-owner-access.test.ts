import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    getManagedProviderPermissionScopes: vi.fn(),
    getManagedProviderScopes: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))
vi.mock('./provider-access.service.js', () => ({
    getManagedProviderPermissionScopes: mocks.getManagedProviderPermissionScopes,
    getManagedProviderScopes: mocks.getManagedProviderScopes,
    hasProviderWorkspacePermission: vi.fn(),
    hasProviderWorkspacePermissionWithManager: vi.fn(),
    isManagedProviderLocationAllowed: vi.fn(),
}))

import { UserRole } from '../../entities/user/user.entity.js'
import { getMyAutoCareChats } from './autocare-chat.service.js'
import { getOwnerAutoCareServiceRequests } from './autocare-request.service.js'
import { getOwnerAutoCareProviders } from './autocare.service.js'

describe('owner provider catalog access', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.getManagedProviderPermissionScopes.mockReset()
        mocks.getManagedProviderScopes.mockReset()
    })

    it('does not expose provider profiles or offers to a staff-only scope without catalog permission', async () => {
        // A broad workspace scope is intentionally present to prove this
        // aggregate endpoint asks for the catalog capability, not membership
        // alone. Staff still keep their request/calendar access elsewhere.
        mocks.getManagedProviderScopes.mockResolvedValue([{
            providerId: 'provider-1',
            locationIds: ['location-a'],
            roles: ['staff'],
        }])
        mocks.getManagedProviderPermissionScopes.mockResolvedValue([])

        await expect(getOwnerAutoCareProviders({ id: 'staff-1' } as never)).resolves.toEqual([])
        expect(mocks.getManagedProviderPermissionScopes).toHaveBeenCalledWith('staff-1', 'catalog')
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('does not expose owner request aggregates without the requests capability', async () => {
        mocks.getManagedProviderPermissionScopes.mockResolvedValue([])

        await expect(getOwnerAutoCareServiceRequests({ id: 'membership-without-requests' } as never)).resolves.toEqual([])
        expect(mocks.getManagedProviderPermissionScopes).toHaveBeenCalledWith('membership-without-requests', 'requests')
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('does not expose provider chats without the chats capability', async () => {
        mocks.getManagedProviderPermissionScopes.mockResolvedValue([])
        mocks.getRepository.mockReturnValue({})

        await expect(getMyAutoCareChats({ id: 'membership-without-chats', role: UserRole.Owner } as never)).resolves.toEqual([])
        expect(mocks.getManagedProviderPermissionScopes).toHaveBeenCalledWith('membership-without-chats', 'chats')
    })
})
