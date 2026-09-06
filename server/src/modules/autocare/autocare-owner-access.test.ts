import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    getManagedProviderPermissionScopes: vi.fn(),
    getManagedProviderScopes: vi.fn(),
    hasProviderWorkspacePermission: vi.fn(),
}))

const providerId = '11111111-1111-4111-8111-111111111111'
const locationId = '22222222-2222-4222-8222-222222222222'

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))
vi.mock('./provider-access.service.js', () => ({
    getManagedProviderPermissionScopes: mocks.getManagedProviderPermissionScopes,
    getManagedProviderScopes: mocks.getManagedProviderScopes,
    hasProviderWorkspacePermission: mocks.hasProviderWorkspacePermission,
    hasProviderWorkspacePermissionWithManager: vi.fn(),
    isManagedProviderLocationAllowed: vi.fn(),
}))

import { UserRole } from '../../entities/user/user.entity.js'
import { getOwnerAutoCareProviderAnalytics } from './autocare-analytics.service.js'
import { getMyAutoCareChats } from './autocare-chat.service.js'
import { getOwnerAutoCareServiceRequests } from './autocare-request.service.js'
import { getOwnerAutoCareCapacityResources, getOwnerAutoCareProviderReviews, getOwnerAutoCareProviders } from './autocare.service.js'

describe('owner provider catalog access', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.getManagedProviderPermissionScopes.mockReset()
        mocks.getManagedProviderScopes.mockReset()
        mocks.hasProviderWorkspacePermission.mockReset()
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

    it('does not expose provider analytics without the analytics capability', async () => {
        mocks.getManagedProviderPermissionScopes.mockResolvedValue([])

        await expect(getOwnerAutoCareProviderAnalytics({ id: 'staff-1' } as never, providerId)).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.getManagedProviderPermissionScopes).toHaveBeenCalledWith('staff-1', 'analytics')
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('does not expose capacity resources without the calendar capability', async () => {
        mocks.hasProviderWorkspacePermission.mockResolvedValue(false)

        await expect(getOwnerAutoCareCapacityResources({ id: 'membership-without-calendar' } as never, providerId, locationId)).rejects.toMatchObject({ statusCode: 403 })
        expect(mocks.hasProviderWorkspacePermission).toHaveBeenCalledWith('membership-without-calendar', providerId, 'calendar', locationId)
        expect(mocks.getRepository).not.toHaveBeenCalled()
    })

    it('does not expose provider reviews without the reviews capability', async () => {
        mocks.getRepository.mockReturnValue({ findOneBy: vi.fn().mockResolvedValue({ id: providerId, status: 'active' }) })
        mocks.getManagedProviderPermissionScopes.mockResolvedValue([])

        await expect(getOwnerAutoCareProviderReviews({ id: 'staff-1' } as never, providerId)).rejects.toMatchObject({ statusCode: 404 })
        expect(mocks.getManagedProviderPermissionScopes).toHaveBeenCalledWith('staff-1', 'reviews')
    })
})
