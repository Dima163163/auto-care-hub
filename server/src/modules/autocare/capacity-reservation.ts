export type CapacityReservation = {
    startsAtMinutes: number
    durationMinutes: number
}

export type CapacityResourceType = 'specialist' | 'bay' | 'lift' | 'equipment'

export type CapacityResource = {
    id: string
    type: CapacityResourceType
    capacity: number
    active?: boolean
}

export type ResourceCapacityReservation = CapacityReservation & {
    resourceId: string
}

export function normalizeAppointmentCapacity(value: number | null | undefined) {
    return Number.isInteger(value) && value && value > 0 ? value : 1
}

export function countOverlappingCapacityReservations(
    candidate: CapacityReservation,
    reservations: readonly CapacityReservation[],
) {
    const candidateEnd = candidate.startsAtMinutes + candidate.durationMinutes

    return reservations.filter((reservation) => {
        const reservationEnd = reservation.startsAtMinutes + reservation.durationMinutes
        return candidate.startsAtMinutes < reservationEnd && candidateEnd > reservation.startsAtMinutes
    }).length
}

export function hasAvailableAppointmentCapacity(input: {
    capacity: number | null | undefined
    candidate: CapacityReservation
    reservations: readonly CapacityReservation[]
}) {
    return countOverlappingCapacityReservations(input.candidate, input.reservations)
        < normalizeAppointmentCapacity(input.capacity)
}

/**
 * Counts reservations for one physical/logical resource that overlap a
 * candidate appointment. Keeping this policy pure makes it reusable by the
 * API transaction and by concurrency tests without coupling either to ORM
 * entities.
 */
export function countOverlappingResourceReservations(
    resourceId: string,
    candidate: CapacityReservation,
    reservations: readonly ResourceCapacityReservation[],
) {
    return countOverlappingCapacityReservations(candidate, reservations.filter((reservation) => reservation.resourceId === resourceId))
}

/**
 * Every explicitly required resource must have free capacity. An empty list
 * means that the branch-level capacity policy is used instead.
 */
export function hasAvailableResourceCapacity(input: {
    resources: readonly CapacityResource[]
    requiredResourceIds: readonly string[]
    candidate: CapacityReservation
    reservations: readonly ResourceCapacityReservation[]
}) {
    return input.requiredResourceIds.every((resourceId) => {
        const resource = input.resources.find((item) => item.id === resourceId && item.active !== false)
        if (!resource) return false
        return countOverlappingResourceReservations(resourceId, input.candidate, input.reservations)
            < normalizeAppointmentCapacity(resource.capacity)
    })
}

/** Selects one available resource for each requested type, deterministically. */
export function selectAvailableResources(input: {
    resources: readonly CapacityResource[]
    requiredTypes: readonly CapacityResourceType[]
    candidate: CapacityReservation
    reservations: readonly ResourceCapacityReservation[]
}) {
    const selected: string[] = []
    for (const type of input.requiredTypes) {
        const resource = input.resources
            .filter((item) => item.type === type && item.active !== false)
            .sort((left, right) => left.id.localeCompare(right.id))
            .find((item) => countOverlappingResourceReservations(item.id, input.candidate, input.reservations)
                < normalizeAppointmentCapacity(item.capacity))
        if (!resource) return null
        selected.push(resource.id)
    }
    return selected
}
