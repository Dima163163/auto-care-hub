import { type AutoCareCapacityReservation } from "@/entities/automotive-service"
import { mockAutoCareServiceRequests, mockCapacityResources } from './mock-fixtures'

export function getMockCapacityResources(providerId: string, locationId?: string) {
    const resources = mockCapacityResources.get(providerId) ?? []
    return locationId ? resources.filter((resource) => resource.locationId === locationId) : resources
}

export function getMockCapacityReservations(providerId: string, locationId?: string, from?: string, to?: string) {
    const resources = getMockCapacityResources(providerId, locationId)
    const byType = new Map(resources.map((resource) => [resource.type, resource]))
    const requests = mockAutoCareServiceRequests.filter((request) => request.providerId === providerId && request.status === 'accepted' && Boolean(request.preferredAt) && (!locationId || request.locationId === locationId))
    const reservations: AutoCareCapacityReservation[] = []
    for (const request of requests) {
        if (!request.preferredAt) continue
        const startsAt = new Date(request.preferredAt)
        const endsAt = new Date(startsAt.getTime() + 60 * 60_000)
        if (from && endsAt <= new Date(from)) continue
        if (to && startsAt >= new Date(to)) continue
        const resource = byType.get('bay') ?? resources[0]
        if (!resource) continue
        reservations.push({
            id: `mock-reservation-${request.id}-${resource.id}`,
            requestId: request.id,
            resourceId: resource.id,
            providerId,
            locationId: request.locationId,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            status: 'active',
            releasedAt: null,
            createdAt: request.createdAt,
        })
    }
    return reservations
}
