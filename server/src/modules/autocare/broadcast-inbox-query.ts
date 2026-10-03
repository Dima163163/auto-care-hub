import type { SelectQueryBuilder } from 'typeorm'
import type { AutoCareBroadcastRequestEntity } from '../../entities/index.js'

// SQL predicates precede ORDER/LIMIT. Only scoped active-provider branches are
// supplied by the service; the joins also verify provider/location consistency.
export function scopeBroadcastInbox(query: SelectQueryBuilder<AutoCareBroadcastRequestEntity>, locationIds: string[], publicMarketIds: string[], now: Date) {
    return query.where('broadcast.status = :status', { status: 'open' })
        .andWhere('broadcast.expiresAt > :now', { now })
        .andWhere(`(
            EXISTS (
                SELECT 1 FROM autocare_broadcast_offers participant
                JOIN autocare_service_locations participant_location
                  ON participant_location.id = participant."locationId"
                 AND participant_location."providerId" = participant."providerId"
                WHERE participant."broadcastRequestId" = broadcast.id
                  AND participant_location.id IN (:...locationIds)
                  AND (broadcast.marketId IS NULL OR participant_location."marketId" = broadcast.marketId)
            ) OR EXISTS (
                SELECT 1 FROM autocare_service_offerings offering
                JOIN autocare_service_locations offering_location ON offering_location.id = offering."locationId"
                WHERE offering.active = true
                  AND offering."definitionId" = broadcast.serviceDefinitionId
                  AND offering_location.id IN (:...locationIds)
                  AND offering_location."marketId" = broadcast.marketId
                  AND ${publicMarketIds.length ? 'offering_location."marketId" IN (:...publicMarketIds)' : 'FALSE'}
            )
        )`, { locationIds, publicMarketIds })
}
