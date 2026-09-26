import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'

export const AUTOCARE_MIN_BOOKING_LEAD_TIME_MS = 15 * 60_000

const serviceRequestStatusesThatCanReceiveAnEstimate = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
])

const serviceRequestStatusesThatCanBeRescheduled = new Set<ServiceRequestStatus>([
    ServiceRequestStatus.Open,
    ServiceRequestStatus.AwaitingReply,
    ServiceRequestStatus.EstimateShared,
    ServiceRequestStatus.Accepted,
])

export function canCreateAutoCareServiceQuote(status: ServiceRequestStatus) {
    return serviceRequestStatusesThatCanReceiveAnEstimate.has(status)
}

export function canDecideAutoCareReschedule(status: ServiceRequestStatus, proposedAt: Date, now = Date.now()) {
    return serviceRequestStatusesThatCanBeRescheduled.has(status)
        && isAutoCareVisitTimeBookable(proposedAt, now)
}

export function isAutoCareVisitTimeBookable(
    preferredAt: Date,
    now = Date.now(),
    minimumLeadTimeMs = AUTOCARE_MIN_BOOKING_LEAD_TIME_MS,
) {
    const timestamp = preferredAt.getTime()
    return Number.isFinite(timestamp) && timestamp >= now + minimumLeadTimeMs
}

export function isAutoCareServiceOfferExpired(expiresAt: string | null, now = Date.now()) {
    if (expiresAt === null) return false
    const timestamp = Date.parse(expiresAt)
    return !Number.isFinite(timestamp) || timestamp <= now
}
