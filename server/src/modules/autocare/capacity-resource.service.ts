import type { EntityManager } from 'typeorm'

import {
    AutoCareCapacityReservationEntity,
    AutoCareCapacityReservationStatus,
    AutoCareCapacityResourceEntity,
    AutoCareCapacityResourceType,
} from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { normalizeAppointmentCapacity } from './capacity-reservation.js'

export type AutoCareResourceRequirement = {
    requiredResourceTypes?: readonly string[] | null
    requiredResourceIds?: readonly string[] | null
}

type ReservationInput = AutoCareResourceRequirement & {
    requestId: string
    providerId: string
    locationId: string
    startsAt: Date
    durationMinutes: number
    excludeRequestId?: string
}

export async function hasAutoCareResourceAvailability(manager: EntityManager, input: Omit<ReservationInput, 'requestId'> & { requestId?: string }) {
    const requiredTypes = normalizeTypes(input.requiredResourceTypes)
    const explicitIds = [...new Set(input.requiredResourceIds ?? [])]
    if (requiredTypes.length === 0 && explicitIds.length === 0) return true
    if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) return false
    const resources = await manager.getRepository(AutoCareCapacityResourceEntity).find({
        where: { providerId: input.providerId, locationId: input.locationId, active: true },
        order: { id: 'ASC' },
    })
    const resourceById = new Map(resources.map((resource) => [resource.id, resource]))
    const selected = explicitIds.map((id) => resourceById.get(id)).filter((resource): resource is AutoCareCapacityResourceEntity => Boolean(resource))
    if (selected.length !== explicitIds.length) return false
    const usedIds = new Set(selected.map((resource) => resource.id))
    const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000)
    const repository = manager.getRepository(AutoCareCapacityReservationEntity)
    // Explicit resource requirements participate in the same capacity check as
    // type-based requirements.  Without this guard an offering pinned to a
    // specific lift/bay would advertise a slot even when that resource was
    // already fully occupied.
    for (const resource of selected) {
        const overlaps = await repository.createQueryBuilder('reservation')
            .where('reservation.resourceId = :resourceId', { resourceId: resource.id })
            .andWhere('reservation.status = :status', { status: AutoCareCapacityReservationStatus.Active })
            .andWhere('reservation.startsAt < :endsAt AND reservation.endsAt > :startsAt', { startsAt: input.startsAt, endsAt })
            .andWhere(input.requestId ? 'reservation.requestId <> :requestId' : '1 = 1', { requestId: input.requestId })
            .getCount()
        if (overlaps >= normalizeAppointmentCapacity(resource.capacity)) return false
    }
    for (const requiredType of requiredTypes) {
        const candidates = resources.filter((resource) => resource.type === requiredType && !usedIds.has(resource.id))
        let available = false
        for (const candidate of candidates) {
            const overlaps = await repository.createQueryBuilder('reservation')
                .where('reservation.resourceId = :resourceId', { resourceId: candidate.id })
                .andWhere('reservation.status = :status', { status: AutoCareCapacityReservationStatus.Active })
                .andWhere('reservation.startsAt < :endsAt AND reservation.endsAt > :startsAt', { startsAt: input.startsAt, endsAt })
                .andWhere(input.requestId ? 'reservation.requestId <> :requestId' : '1 = 1', { requestId: input.requestId })
                .getCount()
            if (overlaps < normalizeAppointmentCapacity(candidate.capacity)) {
                selected.push(candidate)
                usedIds.add(candidate.id)
                available = true
                break
            }
        }
        if (!available) return false
    }
    return true
}

function conflict(message: string): never {
    throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message })
}

function normalizeTypes(types: readonly string[] | null | undefined) {
    return [...new Set((types ?? []).filter((type): type is AutoCareCapacityResourceType => Object.values(AutoCareCapacityResourceType).includes(type as AutoCareCapacityResourceType)))]
}

/**
 * Creates resource reservations while holding resource rows in a deterministic
 * order. This complements (rather than replaces) the branch-level location
 * lock, so old offerings with no requirements keep their legacy behaviour.
 */
export async function reserveAutoCareResources(manager: EntityManager, input: ReservationInput) {
    const requiredTypes = normalizeTypes(input.requiredResourceTypes)
    const explicitIds = [...new Set(input.requiredResourceIds ?? [])]
    if (requiredTypes.length === 0 && explicitIds.length === 0) return []
    if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) conflict('The requested resource duration is invalid.')

    const resourceRepository = manager.getRepository(AutoCareCapacityResourceEntity)
    const resources = await resourceRepository.find({
        where: { providerId: input.providerId, locationId: input.locationId, active: true },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
    })
    const resourcesById = new Map(resources.map((resource) => [resource.id, resource]))
    const explicitResources = explicitIds.map((resourceId) => resourcesById.get(resourceId))
    if (explicitResources.some((resource) => !resource)) conflict('One or more requested resources are not available at this location.')

    const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000)
    const reservationRepository = manager.getRepository(AutoCareCapacityReservationEntity)
    const selected = explicitResources.filter((resource): resource is AutoCareCapacityResourceEntity => Boolean(resource))
    const usedIds = new Set(selected.map((resource) => resource.id))
    for (const requiredType of requiredTypes) {
        const candidates = resources.filter((resource) => resource.type === requiredType && !usedIds.has(resource.id))
        let candidate: AutoCareCapacityResourceEntity | undefined
        for (const resource of candidates) {
            const overlaps = await reservationRepository.createQueryBuilder('reservation')
                .where('reservation.resourceId = :resourceId', { resourceId: resource.id })
                .andWhere('reservation.status = :status', { status: AutoCareCapacityReservationStatus.Active })
                .andWhere('reservation.startsAt < :endsAt AND reservation.endsAt > :startsAt', { startsAt: input.startsAt, endsAt })
                .andWhere(input.excludeRequestId ? 'reservation.requestId <> :excludeRequestId' : 'reservation.requestId <> :requestId', { excludeRequestId: input.excludeRequestId, requestId: input.requestId })
                .getMany()
            if (overlaps.length < normalizeAppointmentCapacity(resource.capacity)) {
                candidate = resource
                break
            }
        }
        if (!candidate) conflict(`The selected visit time is no longer available for the requested ${requiredType} resource.`)
        selected.push(candidate)
        usedIds.add(candidate.id)
    }

    for (const resource of selected) {
        const existing = await reservationRepository.findOneBy({
            requestId: input.requestId,
            resourceId: resource.id,
            status: AutoCareCapacityReservationStatus.Active,
        })
        if (existing) continue
        const overlaps = await reservationRepository.createQueryBuilder('reservation')
            .where('reservation.resourceId = :resourceId', { resourceId: resource.id })
            .andWhere('reservation.status = :status', { status: AutoCareCapacityReservationStatus.Active })
            .andWhere('reservation.startsAt < :endsAt AND reservation.endsAt > :startsAt', { startsAt: input.startsAt, endsAt })
            .andWhere('reservation.requestId <> :requestId', { requestId: input.excludeRequestId ?? input.requestId })
            .getMany()
        if (overlaps.length >= normalizeAppointmentCapacity(resource.capacity)) conflict('The selected visit time is no longer available for the requested resource.')
        await reservationRepository.save(reservationRepository.create({
            requestId: input.requestId,
            resourceId: resource.id,
            providerId: input.providerId,
            locationId: input.locationId,
            startsAt: input.startsAt,
            endsAt,
            status: AutoCareCapacityReservationStatus.Active,
            releasedAt: null,
        }))
    }
    return selected
}

export async function releaseAutoCareResources(manager: EntityManager, requestId: string) {
    const repository = manager.getRepository(AutoCareCapacityReservationEntity)
    const reservations = await repository.findBy({ requestId, status: AutoCareCapacityReservationStatus.Active })
    if (reservations.length === 0) return 0
    const now = new Date()
    for (const reservation of reservations) {
        reservation.status = AutoCareCapacityReservationStatus.Released
        reservation.releasedAt = now
    }
    await repository.save(reservations)
    return reservations.length
}

export async function listAutoCareCapacityResources(manager: EntityManager, providerId: string, locationId?: string) {
    return manager.getRepository(AutoCareCapacityResourceEntity).find({
        where: locationId ? { providerId, locationId } : { providerId },
        order: { locationId: 'ASC', type: 'ASC', name: 'ASC' },
    })
}

export async function listAutoCareCapacityReservations(manager: EntityManager, input: { providerId: string; locationId?: string; from?: Date; to?: Date }) {
    const query = manager.getRepository(AutoCareCapacityReservationEntity).createQueryBuilder('reservation')
        .where('reservation.providerId = :providerId', { providerId: input.providerId })
        .andWhere('reservation.status = :status', { status: AutoCareCapacityReservationStatus.Active })
        .orderBy('reservation.startsAt', 'ASC')
        .addOrderBy('reservation.id', 'ASC')
    if (input.locationId) query.andWhere('reservation.locationId = :locationId', { locationId: input.locationId })
    if (input.from) query.andWhere('reservation.endsAt > :from', { from: input.from })
    if (input.to) query.andWhere('reservation.startsAt < :to', { to: input.to })
    return query.getMany()
}

/** Seeds predictable defaults for a new branch; owners can later rename/deactivate them. */
export async function ensureDefaultAutoCareResources(manager: EntityManager, input: { providerId: string; locationId: string; specialists: number; bays: number; lifts?: number }) {
    const repository = manager.getRepository(AutoCareCapacityResourceEntity)
    const existing = await repository.find({ where: { providerId: input.providerId, locationId: input.locationId } })
    const existingNames = new Set(existing.map((resource) => resource.name))
    const defaults: Array<{ type: AutoCareCapacityResourceType; name: string }> = []
    for (let index = 1; index <= Math.max(1, input.specialists); index += 1) defaults.push({ type: AutoCareCapacityResourceType.Specialist, name: `Специалист ${index}` })
    for (let index = 1; index <= Math.max(1, input.bays); index += 1) defaults.push({ type: AutoCareCapacityResourceType.Bay, name: `Пост ${index}` })
    // A workstation can be backed by a lift, but the owner may deactivate or
    // rename the generated lift rows when a branch uses floor-level bays.
    for (let index = 1; index <= Math.max(0, input.lifts ?? 0); index += 1) defaults.push({ type: AutoCareCapacityResourceType.Lift, name: `Подъёмник ${index}` })
    const missing = defaults.filter(({ name }) => !existingNames.has(name))
    if (missing.length > 0) await repository.save(missing.map(({ type, name }) => repository.create({ providerId: input.providerId, locationId: input.locationId, type, name, capacity: 1, active: true, metadata: {} })))
    return repository.find({ where: { providerId: input.providerId, locationId: input.locationId }, order: { type: 'ASC', name: 'ASC' } })
}
