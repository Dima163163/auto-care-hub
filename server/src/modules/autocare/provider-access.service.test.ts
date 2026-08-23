import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getRepository: vi.fn(),
}))

vi.mock('../../database/data-source.js', () => ({ AppDataSource: mocks }))

import {
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
} from '../../entities/index.js'
import { canManageProvider, getManagedProviderIds, getManagedProviderScopes, isManagedProviderLocationAllowed } from './provider-access.service.js'

function membershipQuery(getOne: () => Promise<unknown>) {
    const query = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne,
    }
    return query
}

describe('provider access boundary', () => {
    beforeEach(() => {
        mocks.getRepository.mockReset()
    })

    it('allows the direct owner without consulting memberships', async () => {
        const providerRepository = { findOne: vi.fn().mockResolvedValue({ id: 'provider-1', ownerId: 'owner-1', status: AutomotiveProviderStatus.Active }) }
        const membershipRepository = { createQueryBuilder: vi.fn() }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : membershipRepository)

        await expect(canManageProvider('owner-1', 'provider-1')).resolves.toBe(true)
        expect(membershipRepository.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('rejects suspended providers even when the user owns them', async () => {
        const providerRepository = { findOne: vi.fn().mockResolvedValue({ id: 'provider-1', ownerId: 'owner-1', status: AutomotiveProviderStatus.Suspended }) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : { createQueryBuilder: vi.fn() })

        await expect(canManageProvider('owner-1', 'provider-1')).resolves.toBe(false)
    })

    it('allows an active provider-wide membership and keeps the location predicate broad', async () => {
        const providerRepository = { findOne: vi.fn().mockResolvedValue({ id: 'provider-1', ownerId: 'owner-1', status: AutomotiveProviderStatus.Active }) }
        const query = membershipQuery(async () => ({ id: 'membership-1', status: AutomotiveProviderMembershipStatus.Active }))
        const membershipRepository = { createQueryBuilder: vi.fn(() => query) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : membershipRepository)

        await expect(canManageProvider('manager-1', 'provider-1', 'location-2')).resolves.toBe(true)
        expect(query.andWhere).toHaveBeenCalledWith(
            '(membership.locationId IS NULL OR membership.locationId = :locationId)',
            { locationId: 'location-2' },
        )
    })

    it('denies a revoked or unrelated branch membership', async () => {
        const providerRepository = { findOne: vi.fn().mockResolvedValue({ id: 'provider-1', ownerId: 'owner-1', status: AutomotiveProviderStatus.Active }) }
        const query = membershipQuery(async () => null)
        const membershipRepository = { createQueryBuilder: vi.fn(() => query) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : membershipRepository)

        await expect(canManageProvider('staff-1', 'provider-1', 'location-2')).resolves.toBe(false)
        expect(query.andWhere).toHaveBeenCalledWith('membership.status = :status', { status: AutomotiveProviderMembershipStatus.Active })
    })

    it('deduplicates directly owned and membership-managed providers', async () => {
        const providerRepository = { find: vi.fn().mockResolvedValue([{ id: 'provider-1' }, { id: 'provider-2' }]) }
        const membershipRepository = { find: vi.fn().mockResolvedValue([{ providerId: 'provider-2' }, { providerId: 'provider-3' }]) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : membershipRepository)

        await expect(getManagedProviderIds('owner-1')).resolves.toEqual(['provider-1', 'provider-2', 'provider-3'])
    })

    it('limits a branch membership to its assigned location', async () => {
        const providerRepository = { find: vi.fn().mockResolvedValue([]) }
        const membershipRepository = { find: vi.fn().mockResolvedValue([{ providerId: 'provider-1', locationId: 'location-a' }]) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : membershipRepository)

        const scopes = await getManagedProviderScopes('staff-1')
        expect(scopes).toEqual([{ providerId: 'provider-1', locationIds: ['location-a'] }])
        expect(isManagedProviderLocationAllowed(scopes, 'provider-1', 'location-a')).toBe(true)
        expect(isManagedProviderLocationAllowed(scopes, 'provider-1', 'location-b')).toBe(false)
    })

    it('keeps a direct owner authorized across every provider branch', async () => {
        const providerRepository = { find: vi.fn().mockResolvedValue([{ id: 'provider-1' }]) }
        const membershipRepository = { find: vi.fn().mockResolvedValue([]) }
        mocks.getRepository.mockImplementation((entity: unknown) => entity === AutomotiveProviderEntity ? providerRepository : membershipRepository)

        const scopes = await getManagedProviderScopes('owner-1')
        expect(scopes).toEqual([{ providerId: 'provider-1', locationIds: null }])
        expect(isManagedProviderLocationAllowed(scopes, 'provider-1', 'location-a')).toBe(true)
        expect(isManagedProviderLocationAllowed(scopes, 'provider-1', 'location-b')).toBe(true)
    })
})
