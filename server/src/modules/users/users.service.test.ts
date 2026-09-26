import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    getManagedProviderPermissionScopes: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository } }))
vi.mock('../autocare/provider-access.service.js', () => ({
    getManagedProviderPermissionScopes: mocks.getManagedProviderPermissionScopes,
    isManagedProviderLocationAllowed: (scopes: Array<{ providerId: string; locationIds: string[] | null }>, providerId: string, locationId: string | null) => {
        const scope = scopes.find((item) => item.providerId === providerId)
        return scope?.locationIds === null
            ? true
            : Boolean(scope && locationId && scope.locationIds.includes(locationId))
    },
}))

import { BookingEntity } from '../../entities/booking/booking.entity.js'
import { ServiceRequestEntity } from '../../entities/automotive/service-request.entity.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { getOwnerClients } from './users.service.js'

describe('getOwnerClients branch access', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.getManagedProviderPermissionScopes.mockReset()
    })

    it('returns clients only from branches covered by the owner request scopes', async () => {
        const bookingQuery = {
            innerJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            distinct: vi.fn().mockReturnThis(),
            getRawMany: vi.fn().mockResolvedValue([]),
        }
        const requestQuery = {
            where: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            distinct: vi.fn().mockReturnThis(),
            getRawMany: vi.fn().mockResolvedValue([
                { clientId: 'client-branch-a', providerId: 'provider-branch-scoped', locationId: 'location-a' },
                { clientId: 'client-branch-b', providerId: 'provider-branch-scoped', locationId: 'location-b' },
                { clientId: 'client-provider-wide', providerId: 'provider-wide', locationId: 'location-c' },
                { clientId: 'client-outside-scope', providerId: 'provider-outside-scope', locationId: 'location-a' },
            ]),
        }
        const clients = [
            { id: 'client-branch-a', name: 'Branch A', email: 'a@example.test', phone: null },
            { id: 'client-provider-wide', name: 'Provider wide', email: 'wide@example.test', phone: null },
        ]

        mocks.getManagedProviderPermissionScopes.mockResolvedValue([
            { providerId: 'provider-branch-scoped', locationIds: ['location-a'] },
            { providerId: 'provider-wide', locationIds: null },
        ])
        mocks.getRepository.mockImplementation((entity: unknown) => {
            if (entity === BookingEntity) return { createQueryBuilder: () => bookingQuery }
            if (entity === ServiceRequestEntity) return { createQueryBuilder: () => requestQuery }
            if (entity === UserEntity) return { find: vi.fn().mockResolvedValue(clients) }
            throw new Error('Unexpected repository requested in test.')
        })

        await expect(getOwnerClients({ id: 'manager-1', role: UserRole.Owner } as UserEntity)).resolves.toEqual([
            { id: 'client-branch-a', name: 'Branch A', email: 'a@example.test', phone: null },
            { id: 'client-provider-wide', name: 'Provider wide', email: 'wide@example.test', phone: null },
        ])
        expect(mocks.getManagedProviderPermissionScopes).toHaveBeenCalledWith('manager-1', 'requests')
        expect(requestQuery.where).toHaveBeenCalledWith('request.providerId IN (:...providerIds)', {
            providerIds: ['provider-branch-scoped', 'provider-wide'],
        })
    })
})
