import { AppDataSource } from '../../database/data-source.js'
import type { EntityManager } from 'typeorm'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
} from '../../entities/index.js'

export type ManagedProviderScope = {
    providerId: string
    /** null means that the membership is allowed to manage every branch. */
    locationIds: string[] | null
}

/**
 * Central provider authorization boundary. Direct ownerId checks remain in
 * place during the migration window, while active memberships can already
 * manage a whole provider or one explicitly assigned branch.
 */
async function canManageProviderWithRepository(getRepository: typeof AppDataSource.getRepository, userId: string, providerId: string, locationId?: string | null) {
    const provider = await getRepository(AutomotiveProviderEntity).findOne({
        where: { id: providerId },
        select: { id: true, ownerId: true, status: true },
    })
    if (!provider || provider.status === AutomotiveProviderStatus.Suspended) return false
    if (provider.ownerId === userId) return true

    const membership = await getRepository(AutomotiveProviderMembershipEntity)
        .createQueryBuilder('membership')
        .where('membership.providerId = :providerId', { providerId })
        .andWhere('membership.userId = :userId', { userId })
        .andWhere('membership.status = :status', { status: AutomotiveProviderMembershipStatus.Active })
        .andWhere(locationId ? '(membership.locationId IS NULL OR membership.locationId = :locationId)' : 'membership.locationId IS NULL', { locationId })
        .getOne()
    return Boolean(membership)
}

export async function canManageProvider(userId: string, providerId: string, locationId?: string | null) {
    return canManageProviderWithRepository(AppDataSource.getRepository.bind(AppDataSource), userId, providerId, locationId)
}

export async function canManageProviderWithManager(manager: EntityManager, userId: string, providerId: string, locationId?: string | null) {
    return canManageProviderWithRepository(manager.getRepository.bind(manager), userId, providerId, locationId)
}

/**
 * Returns the effective branch scope for every provider managed by a user.
 * Direct owners and provider-wide memberships are represented by a null
 * locationIds value; branch memberships are merged into one bounded list.
 */
export async function getManagedProviderScopes(userId: string): Promise<ManagedProviderScope[]> {
    const directProviders = await AppDataSource.getRepository(AutomotiveProviderEntity).find({
        where: { ownerId: userId },
        select: { id: true },
    })
    const memberships = await AppDataSource.getRepository(AutomotiveProviderMembershipEntity).find({
        where: { userId, status: AutomotiveProviderMembershipStatus.Active },
        select: { providerId: true, locationId: true },
    })
    const scopes = new Map<string, Set<string> | null>()
    for (const provider of directProviders) scopes.set(provider.id, null)
    for (const membership of memberships) {
        if (scopes.get(membership.providerId) === null && scopes.has(membership.providerId)) continue
        const locations = scopes.get(membership.providerId) ?? new Set<string>()
        if (membership.locationId === null) scopes.set(membership.providerId, null)
        else if (scopes.get(membership.providerId) !== null) {
            locations.add(membership.locationId)
            scopes.set(membership.providerId, locations)
        }
    }
    return [...scopes.entries()].map(([providerId, locationIds]) => ({
        providerId,
        locationIds: locationIds === null ? null : [...locationIds],
    }))
}

export function isManagedProviderLocationAllowed(scopes: ManagedProviderScope[], providerId: string, locationId: string | null | undefined) {
    const scope = scopes.find((item) => item.providerId === providerId)
    if (!scope) return false
    return scope.locationIds === null
        ? true
        : Boolean(locationId && scope.locationIds.includes(locationId))
}

export async function getManagedProviderIds(userId: string) {
    return (await getManagedProviderScopes(userId)).map(({ providerId }) => providerId)
}
