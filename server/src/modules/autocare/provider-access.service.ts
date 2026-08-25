import { AppDataSource } from '../../database/data-source.js'
import type { EntityManager } from 'typeorm'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipRole,
    AutomotiveProviderMembershipStatus,
    AutomotiveProviderStatus,
} from '../../entities/index.js'

export type ManagedProviderScope = {
    providerId: string
    /** null means that the membership is allowed to manage every branch. */
    locationIds: string[] | null
    roles: AutomotiveProviderMembershipRole[]
}

export type ProviderWorkspacePermission =
    | 'analytics'
    | 'calendar'
    | 'catalog'
    | 'profile'
    | 'requests'
    | 'reviews'
    | 'team'
    | 'bonuses'

const permissionsByRole: Record<AutomotiveProviderMembershipRole, readonly ProviderWorkspacePermission[]> = {
    [AutomotiveProviderMembershipRole.Owner]: ['analytics', 'calendar', 'catalog', 'profile', 'requests', 'reviews', 'team', 'bonuses'],
    [AutomotiveProviderMembershipRole.Manager]: ['analytics', 'calendar', 'catalog', 'requests', 'reviews'],
    [AutomotiveProviderMembershipRole.Staff]: ['calendar', 'requests'],
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
        select: { providerId: true, locationId: true, role: true },
    })
    const scopes = new Map<string, { locations: Set<string> | null; roles: Set<AutomotiveProviderMembershipRole> }>()
    for (const provider of directProviders) {
        scopes.set(provider.id, { locations: null, roles: new Set([AutomotiveProviderMembershipRole.Owner]) })
    }
    for (const membership of memberships) {
        const existing = scopes.get(membership.providerId)
        if (existing?.locations === null && existing.roles.has(AutomotiveProviderMembershipRole.Owner)) continue
        const scope = existing ?? { locations: new Set<string>(), roles: new Set<AutomotiveProviderMembershipRole>() }
        scope.roles.add(membership.role ?? AutomotiveProviderMembershipRole.Staff)
        if (membership.locationId === null) scope.locations = null
        else if (scope.locations !== null) scope.locations.add(membership.locationId)
        scopes.set(membership.providerId, scope)
    }
    return [...scopes.entries()].map(([providerId, scope]) => ({
        providerId,
        locationIds: scope.locations === null ? null : [...scope.locations],
        roles: [...scope.roles],
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

export async function hasProviderWorkspacePermission(
    userId: string,
    providerId: string,
    permission: ProviderWorkspacePermission,
    locationId?: string | null,
) {
    const scope = (await getManagedProviderScopes(userId)).find((item) => item.providerId === providerId)
    if (!scope || (locationId !== undefined && !isManagedProviderLocationAllowed([scope], providerId, locationId))) return false
    return scope.roles.some((role) => permissionsByRole[role].includes(permission))
}

/** Minimal capability endpoint for the web shell. Detailed authorization is
 * always re-checked by the resource service, never trusted from the client. */
export async function getOwnerWorkspaceAccess(userId: string) {
    const scopes = await getManagedProviderScopes(userId)
    return {
        allowed: scopes.length > 0,
        providerIds: scopes.map((scope) => scope.providerId),
        scopes,
    }
}
