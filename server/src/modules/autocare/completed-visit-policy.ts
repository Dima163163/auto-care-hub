import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'

/**
 * A trust-eligible visit must be closed by the service and acknowledged by
 * both sides. `completedAt` is required for persisted production rows; the
 * optional field keeps this helper compatible with legacy projections and
 * aggregate test fixtures that predate the completion timestamp.
 */
export type CompletedVisitLike = {
    status: ServiceRequestStatus
    completedAt?: Date | null
    clientConfirmedAt: Date | null
    providerConfirmedAt: Date | null
}

export function isVerifiedCompletedVisit(request: CompletedVisitLike) {
    return request.status === ServiceRequestStatus.Closed
        && (request.completedAt === undefined || request.completedAt !== null)
        && Boolean(request.clientConfirmedAt && request.providerConfirmedAt)
}
