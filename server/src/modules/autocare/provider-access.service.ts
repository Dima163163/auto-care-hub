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

type ManagedProviderAssignment = {
    providerId: string
    /** null means that the assignment is valid for every branch. */
    locationId: string | null
    role: AutomotiveProviderMembershipRole
}

type ProviderRepositoryGetter = typeof AppDataSource.getRepository

export type ProviderWorkspacePermission =
    | 'analytics'
    | 'calendar'
    | 'catalog'
    | 'chats'
    | 'profile'
    | 'requests'
    | 'reviews'
    | 'team'
    | 'bonuses'

const permissionsByRole: Record<AutomotiveProviderMembershipRole, readonly ProviderWorkspacePermission[]> = {
    [AutomotiveProviderMembershipRole.Owner]: ['analytics', 'calendar', 'catalog', 'chats', 'profile', 'requests', 'reviews', 'team', 'bonuses'],
    [AutomotiveProviderMembershipRole.Manager]: ['analytics', 'calendar', 'catalog', 'chats', 'requests', 'reviews'],
    [AutomotiveProviderMembershipRole.Staff]: ['calendar', 'chats', 'requests'],
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
 * Keeps a role attached to the branch where it was granted. Aggregated scopes
 * are useful for list queries, but cannot be used to authorize a mutation:
 * merging `manager@branch-a` and `staff@branch-b` would otherwise make the
 * manager permission valid on both branches.
 */
async function getManagedProviderAssignmentsWithRepository(getRepository: ProviderRepositoryGetter, userId: string): Promise<ManagedProviderAssignment[]> {
    const directProviders = await getRepository(AutomotiveProviderEntity).find({
        where: { ownerId: userId },
        select: { id: true },
    })
    const directProviderIds = new Set(directProviders.map(({ id }) => id))
    const memberships = await getRepository(AutomotiveProviderMembershipEntity).find({
        where: { userId, status: AutomotiveProviderMembershipStatus.Active },
        select: { providerId: true, locationId: true, role: true },
    })

    return [
        ...directProviders.map(({ id }) => ({ providerId: id, locationId: null, role: AutomotiveProviderMembershipRole.Owner })),
        ...memberships
            // Direct ownership is provider-wide and must not be downgraded or
            // split by stale membership rows for the same user.
            .filter(({ providerId }) => !directProviderIds.has(providerId))
            .map(({ providerId, locationId, role }) => ({
                providerId,
                locationId,
                role: role ?? AutomotiveProviderMembershipRole.Staff,
            })),
    ]
}

async function getManagedProviderAssignments(userId: string): Promise<ManagedProviderAssignment[]> {
    return getManagedProviderAssignmentsWithRepository(AppDataSource.getRepository.bind(AppDataSource), userId)
}

function aggregateProviderScopes(assignments: ManagedProviderAssignment[]): ManagedProviderScope[] {
    const scopes = new Map<string, { locations: Set<string> | null; roles: Set<AutomotiveProviderMembershipRole> }>()
    for (const assignment of assignments) {
        const existing = scopes.get(assignment.providerId)
        const scope = existing ?? { locations: new Set<string>(), roles: new Set<AutomotiveProviderMembershipRole>() }
        scope.roles.add(assignment.role)
        if (assignment.locationId === null) scope.locations = null
        else if (scope.locations !== null) scope.locations.add(assignment.locationId)
        scopes.set(assignment.providerId, scope)
    }
    return [...scopes.entries()].map(([providerId, scope]) => ({
        providerId,
        locationIds: scope.locations === null ? null : [...scope.locations],
        roles: [...scope.roles],
    }))
}

async function hasProviderWorkspacePermissionWithRepository(
    getRepository: ProviderRepositoryGetter,
    userId: string,
    providerId: string,
    permission: ProviderWorkspacePermission,
    locationId?: string | null,
) {
    const assignments = (await getManagedProviderAssignmentsWithRepository(getRepository, userId)).filter((item) => item.providerId === providerId)
    return assignments.some((assignment) => {
        if (!permissionsByRole[assignment.role].includes(permission)) return false
        if (locationId === undefined) return true
        return locationId === null
            ? assignment.locationId === null
            : assignment.locationId === null || assignment.locationId === locationId
    })
}

/**
 * Returns the effective branch scope for every provider managed by a user.
 * Direct owners and provider-wide memberships are represented by a null
 * locationIds value; branch memberships are merged into one bounded list.
 */
export async function getManagedProviderScopes(userId: string): Promise<ManagedProviderScope[]> {
    const assignments = await getManagedProviderAssignments(userId)
    return aggregateProviderScopes(assignments)
}

/**
 * Returns only the branches where a role is allowed to use the requested
 * workspace capability. This must be used for aggregate views (analytics,
 * reviews, catalog, etc.) so a user with different roles on different
 * branches cannot widen a permission by merging those assignments first.
 */
export async function getManagedProviderPermissionScopes(userId: string, permission: ProviderWorkspacePermission): Promise<ManagedProviderScope[]> {
    const assignments = (await getManagedProviderAssignments(userId)).filter((assignment) => permissionsByRole[assignment.role].includes(permission))
    return aggregateProviderScopes(assignments)
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
    return hasProviderWorkspacePermissionWithRepository(AppDataSource.getRepository.bind(AppDataSource), userId, providerId, permission, locationId)
}

export async function hasProviderWorkspacePermissionWithManager(
    manager: EntityManager,
    userId: string,
    providerId: string,
    permission: ProviderWorkspacePermission,
    locationId?: string | null,
) {
    return hasProviderWorkspacePermissionWithRepository(manager.getRepository.bind(manager), userId, providerId, permission, locationId)
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
