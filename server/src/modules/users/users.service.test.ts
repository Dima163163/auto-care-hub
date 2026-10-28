import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
    transaction: vi.fn(),
    getManagedProviderPermissionScopes: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository, transaction: mocks.transaction } }))
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
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { getOwnerClients, updateUserPreferences } from './users.service.js'

describe('getOwnerClients branch access', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
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

describe('updateUserPreferences security state', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
        mocks.transaction.mockReset()
    })

    it('writes only preference columns and returns the current user', async () => {
        const snapshot = {
            id: 'user-1', status: UserStatus.Active, tokenVersion: 1,
            passwordHash: 'old-hash', locale: null,
        } as UserEntity
        const current = { ...snapshot, locale: 'de' } as UserEntity
        const update = vi.fn().mockResolvedValue({ affected: 1 })
        const findOneBy = vi.fn().mockResolvedValue(current)
        mocks.getRepository.mockReturnValue({ update, findOneBy })

        const result = await updateUserPreferences(snapshot, { locale: 'de' })

        expect(update).toHaveBeenCalledWith(
            { id: snapshot.id, status: UserStatus.Active, tokenVersion: 1 },
            { locale: 'de' },
        )
        expect(findOneBy).toHaveBeenCalledWith({
            id: snapshot.id, status: UserStatus.Active, tokenVersion: 1,
        })
        expect(result.locale).toBe('de')
        expect(snapshot.locale).toBeNull()
    })

    it('rejects a snapshot invalidated by blocking before it can write', async () => {
        const snapshot = { id: 'user-1', status: UserStatus.Active, tokenVersion: 1 } as UserEntity
        const update = vi.fn().mockResolvedValue({ affected: 0 })
        const findOneBy = vi.fn()
        mocks.getRepository.mockReturnValue({ update, findOneBy })

        await expect(updateUserPreferences(snapshot, { locale: 'de' }))
            .rejects.toMatchObject({ statusCode: 401 })
        expect(findOneBy).not.toHaveBeenCalled()
    })

    it('updates preferred city under a row lock so its binding uses the user ID', async () => {
        const snapshot = { id: 'user-1', status: UserStatus.Active, tokenVersion: 1, preferredCity: null } as UserEntity
        const current = { ...snapshot } as UserEntity
        const findOne = vi.fn().mockResolvedValue(current)
        const save = vi.fn().mockImplementation(async (record: UserEntity) => record)
        mocks.transaction.mockImplementation((callback: (manager: unknown) => Promise<unknown>) => callback({
            getRepository: () => ({ findOne, save }),
        }))

        const result = await updateUserPreferences(snapshot, { preferredCity: 'Самара' })

        expect(findOne).toHaveBeenCalledWith({
            where: { id: snapshot.id, status: UserStatus.Active, tokenVersion: 1 },
            lock: { mode: 'pessimistic_write' },
        })
        expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: snapshot.id, preferredCity: 'Самара' }))
        expect(result.preferredCity).toBe('Самара')
        expect(snapshot.preferredCity).toBeNull()
    })

    it('rejects a stale preferred city update before saving', async () => {
        const snapshot = { id: 'user-1', status: UserStatus.Active, tokenVersion: 1 } as UserEntity
        const findOne = vi.fn().mockResolvedValue(null)
        const save = vi.fn()
        mocks.transaction.mockImplementation((callback: (manager: unknown) => Promise<unknown>) => callback({
            getRepository: () => ({ findOne, save }),
        }))

        await expect(updateUserPreferences(snapshot, { preferredCity: 'Самара' }))
            .rejects.toMatchObject({ statusCode: 401 })
        expect(save).not.toHaveBeenCalled()
    })
})
