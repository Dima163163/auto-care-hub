import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveServiceLocationEntity, AutoCareCapacityResourceEntity, AutoCareCapacityResourceType } from '../../entities/index.js'
import { type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { getManagedProviderScopes, hasProviderWorkspacePermission } from './provider-access.service.js'
import { ensureDefaultAutoCareResources, listAutoCareCapacityReservations, listAutoCareCapacityResources } from './capacity-resource.service.js'
import { normalizeAutoCareCapacityProviderUuid, normalizeAutoCareCapacityReservationQuery, normalizeAutoCareCapacityResourceInput, normalizeAutoCareCapacityResourcePatch } from './capacity-input-policy.js'

export type AutoCareCapacityResourceInput = {
    locationId: string
    type: AutoCareCapacityResourceType
    name: string
    capacity: number
    active: boolean
    metadata: Record<string, unknown>
}

export type AutoCareCapacityResourcePatch = Partial<Omit<AutoCareCapacityResourceInput, 'locationId'>>

function toCapacityResourceResponse(resource: AutoCareCapacityResourceEntity) {
    return {
        id: resource.id,
        providerId: resource.providerId,
        locationId: resource.locationId,
        type: resource.type,
        name: resource.name,
        capacity: resource.capacity,
        active: resource.active,
        metadata: resource.metadata ?? {},
        createdAt: resource.createdAt.toISOString(),
        updatedAt: resource.updatedAt.toISOString(),
    }
}

function toCapacityReservationResponse(reservation: import('../../entities/index.js').AutoCareCapacityReservationEntity) {
    return {
        id: reservation.id,
        requestId: reservation.requestId,
        resourceId: reservation.resourceId,
        providerId: reservation.providerId,
        locationId: reservation.locationId,
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
        status: reservation.status,
        releasedAt: reservation.releasedAt?.toISOString() ?? null,
        createdAt: reservation.createdAt.toISOString(),
    }
}

export async function getOwnerAutoCareCapacityResources(user: UserEntity, providerId: string, locationId?: string) {
    const normalizedProviderId = normalizeAutoCareCapacityProviderUuid(providerId)
    const normalizedLocationId = locationId === undefined ? undefined : normalizeAutoCareCapacityProviderUuid(locationId)
    if (!normalizedProviderId || (locationId !== undefined && !normalizedLocationId)) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider and location ids must be valid UUIDs.' })
    const scopedLocationId = normalizedLocationId ?? undefined
    if (!(await hasProviderWorkspacePermission(user.id, normalizedProviderId, 'calendar', scopedLocationId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service capacity.' })
    }
    // Resolve the effective branch scope before creating default resources. A
    // branch-scoped member must never trigger writes (or even a read) for
    // another branch simply by omitting `locationId` from the list request.
    const scope = (await getManagedProviderScopes(user.id)).find((item) => item.providerId === normalizedProviderId)
    const locationRepository = AppDataSource.getRepository(AutomotiveServiceLocationEntity)
    const visibleLocationIds = scope?.locationIds === null || !scope ? undefined : scope.locationIds
    if (visibleLocationIds && visibleLocationIds.length === 0) return []
    const locations = await locationRepository.find({
        where: scopedLocationId
            ? { id: scopedLocationId, providerId: normalizedProviderId }
            : visibleLocationIds
                ? { providerId: normalizedProviderId, id: In(visibleLocationIds) }
                : { providerId: normalizedProviderId },
    })
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId })
    if (provider) {
        for (const location of locations) {
            await ensureDefaultAutoCareResources(AppDataSource.manager, {
                providerId: normalizedProviderId,
                locationId: location.id,
                specialists: Math.max(1, provider.staffCount),
                bays: Math.max(1, provider.workstationCount || location.appointmentCapacity || 1),
                lifts: Math.max(0, provider.workstationCount || 0),
            })
        }
    }
    const resources = await listAutoCareCapacityResources(AppDataSource.manager, normalizedProviderId, scopedLocationId)
    return resources
        .filter((resource) => !visibleLocationIds || visibleLocationIds.includes(resource.locationId))
        .map(toCapacityResourceResponse)
}

export async function getOwnerAutoCareCapacityReservations(user: UserEntity, providerId: string, input: { locationId?: string; from?: string; to?: string }) {
    const normalizedProviderId = normalizeAutoCareCapacityProviderUuid(providerId)
    const normalizedInput = normalizeAutoCareCapacityReservationQuery(input)
    if (!normalizedProviderId || !normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Capacity reservation query is invalid.' })
    if (!(await hasProviderWorkspacePermission(user.id, normalizedProviderId, 'calendar', normalizedInput.locationId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service capacity.' })
    }
    const from = normalizedInput.from ? new Date(normalizedInput.from) : undefined
    const to = normalizedInput.to ? new Date(normalizedInput.to) : undefined
    if (from && Number.isNaN(from.getTime())) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Invalid reservation start range.' })
    if (to && Number.isNaN(to.getTime())) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Invalid reservation end range.' })
    if (from && to && from >= to) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Reservation start must be before its end.' })
    const reservations = await listAutoCareCapacityReservations(AppDataSource.manager, { providerId: normalizedProviderId, locationId: normalizedInput.locationId, from, to })
    const scopes = await getManagedProviderScopes(user.id)
    const scope = scopes.find((item) => item.providerId === normalizedProviderId)
    const visible = scope?.locationIds === null || !scope
        ? reservations
        : reservations.filter((reservation) => scope.locationIds?.includes(reservation.locationId))
    return visible.map(toCapacityReservationResponse)
}

export async function createOwnerAutoCareCapacityResource(user: UserEntity, providerId: string, input: AutoCareCapacityResourceInput) {
    const normalizedProviderId = normalizeAutoCareCapacityProviderUuid(providerId)
    const normalizedInput = normalizeAutoCareCapacityResourceInput(input)
    if (!normalizedProviderId || !normalizedInput) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Capacity resource payload is invalid.' })
    if (!(await hasProviderWorkspacePermission(user.id, normalizedProviderId, 'calendar', normalizedInput.locationId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service capacity.' })
    }
    return AppDataSource.transaction(async (manager) => {
        const location = await manager.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: normalizedInput.locationId, providerId: normalizedProviderId })
        if (!location) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Service branch not found.' })
        const repository = manager.getRepository(AutoCareCapacityResourceEntity)
        const existing = await repository.findOneBy({ providerId: normalizedProviderId, locationId: normalizedInput.locationId, name: normalizedInput.name })
        if (existing) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'A resource with this name already exists at the branch.' })
        const resource = await repository.save(repository.create({
            providerId: normalizedProviderId,
            locationId: normalizedInput.locationId,
            type: normalizedInput.type,
            name: normalizedInput.name,
            capacity: normalizedInput.capacity,
            active: normalizedInput.active,
            metadata: normalizedInput.metadata,
        }))
        return toCapacityResourceResponse(resource)
    })
}

export async function updateOwnerAutoCareCapacityResource(user: UserEntity, providerId: string, resourceId: string, patch: AutoCareCapacityResourcePatch) {
    const normalizedProviderId = normalizeAutoCareCapacityProviderUuid(providerId)
    const normalizedResourceId = normalizeAutoCareCapacityProviderUuid(resourceId)
    const normalizedPatch = normalizeAutoCareCapacityResourcePatch(patch)
    if (!normalizedProviderId || !normalizedResourceId) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Provider and resource ids must be valid UUIDs.' })
    if (!normalizedPatch) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Capacity resource patch is invalid.' })
    const resource = await AppDataSource.getRepository(AutoCareCapacityResourceEntity).findOneBy({ id: normalizedResourceId, providerId: normalizedProviderId })
    if (!resource) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Capacity resource not found.' })
    if (!(await hasProviderWorkspacePermission(user.id, normalizedProviderId, 'calendar', resource.locationId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not have access to this service capacity.' })
    }
    if (normalizedPatch.name !== undefined) {
        const duplicate = await AppDataSource.getRepository(AutoCareCapacityResourceEntity).findOneBy({ providerId: normalizedProviderId, locationId: resource.locationId, name: normalizedPatch.name })
        if (duplicate && duplicate.id !== resource.id) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'A resource with this name already exists at the branch.' })
        resource.name = normalizedPatch.name
    }
    if (normalizedPatch.type !== undefined) resource.type = normalizedPatch.type
    if (normalizedPatch.capacity !== undefined) resource.capacity = normalizedPatch.capacity
    if (normalizedPatch.active !== undefined) resource.active = normalizedPatch.active
    if (normalizedPatch.metadata !== undefined) resource.metadata = normalizedPatch.metadata
    return toCapacityResourceResponse(await AppDataSource.getRepository(AutoCareCapacityResourceEntity).save(resource))
}
