import { AppDataSource } from '../../database/data-source.js'
import type { EntityManager } from 'typeorm'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
} from '../../entities/index.js'

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

export async function getManagedProviderIds(userId: string) {
    const directProviders = await AppDataSource.getRepository(AutomotiveProviderEntity).find({
        where: { ownerId: userId },
        select: { id: true },
    })
    const memberships = await AppDataSource.getRepository(AutomotiveProviderMembershipEntity).find({
        where: { userId, status: AutomotiveProviderMembershipStatus.Active },
        select: { providerId: true },
    })
    return [...new Set([...directProviders.map(({ id }) => id), ...memberships.map(({ providerId }) => providerId)])]
}
