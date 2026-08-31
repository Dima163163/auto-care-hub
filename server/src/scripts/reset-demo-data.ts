import { In } from 'typeorm'
import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../database/data-source.js'
import { AutomotiveProviderEntity, AutomotiveServiceLocationEntity } from '../entities/automotive/automotive.entity.js'
import { BookingEntity } from '../entities/booking/booking.entity.js'
import { CabinetEntity } from '../entities/cabinet/cabinet.entity.js'
import { NotificationEntity } from '../entities/notification/notification.entity.js'
import { ReviewEntity } from '../entities/review/review.entity.js'
import { SecurityTokenEntity } from '../entities/security-token/security-token.entity.js'
import { ServiceEntity } from '../entities/service/service.entity.js'
import { UserSessionEntity } from '../entities/user-session/user-session.entity.js'
import { UserEntity } from '../entities/user/user.entity.js'
import { AUTOMOTIVE_MOCK_PROVIDERS } from '../modules/autocare/autocare-mock-catalog.js'
import {
    DEMO_CABINET_TITLE,
    DEMO_USER_EMAILS,
} from './demo-fixtures.js'

function idsOf(records: Array<{ id: string }>) {
    return records.map(({ id }) => id)
}

function uniqueIds(records: Array<{ id: string }>) {
    return [...new Set(idsOf(records))]
}

/**
 * Deletes rows owned by the demo fixture without ever interpolating an id.
 * Table and column names are compile-time constants at each call site; ids
 * always travel through a typed PostgreSQL uuid array parameter.
 */
async function deleteByAny(
    manager: EntityManager,
    table: string,
    column: string,
    ids: string[],
) {
    if (ids.length === 0) return
    await manager.query(`DELETE FROM "${table}" WHERE "${column}" = ANY($1::uuid[])`, [ids])
}

async function deleteByAnyColumns(
    manager: EntityManager,
    table: string,
    columns: string[],
    ids: string[],
) {
    if (ids.length === 0 || columns.length === 0) return
    const predicate = columns.map((column) => `"${column}" = ANY($1::uuid[])`).join(' OR ')
    await manager.query(`DELETE FROM "${table}" WHERE ${predicate}`, [ids])
}

async function resetDemoData() {
    await AppDataSource.initialize()

    try {
        await AppDataSource.transaction(async (manager) => {
            const userRepository = manager.getRepository(UserEntity)
            const cabinetRepository = manager.getRepository(CabinetEntity)
            const serviceRepository = manager.getRepository(ServiceEntity)
            const bookingRepository = manager.getRepository(BookingEntity)
            const providerRepository = manager.getRepository(AutomotiveProviderEntity)
            const locationRepository = manager.getRepository(AutomotiveServiceLocationEntity)

            const users = await userRepository.find({
                where: {
                    email: In(DEMO_USER_EMAILS),
                },
            })
            const userIds = idsOf(users)

            const cabinets = await cabinetRepository.find({
                where: {
                    title: DEMO_CABINET_TITLE,
                },
            })
            const cabinetIds = idsOf(cabinets)

            const services = cabinetIds.length > 0
                ? await serviceRepository.find({
                    where: {
                        cabinetId: In(cabinetIds),
                    },
                })
                : []
            const serviceIds = idsOf(services)

            // AutoCare mock providers are shared catalog rows, so only remove
            // the known fixture names when they are unowned or owned by one
            // of the demo users. A real, user-owned provider is never touched.
            const mockProviderNames = AUTOMOTIVE_MOCK_PROVIDERS.map(({ name }) => name)
            const candidateProviders = await providerRepository.find({
                where: {
                    name: In(mockProviderNames),
                },
            })
            const candidateProviderIds = idsOf(candidateProviders)
            const candidateLocations = candidateProviderIds.length > 0
                ? await locationRepository.find({ where: { providerId: In(candidateProviderIds) } })
                : []
            const locationsByProvider = new Map<string, string[]>()
            for (const location of candidateLocations) {
                const addresses = locationsByProvider.get(location.providerId) ?? []
                addresses.push(location.address)
                locationsByProvider.set(location.providerId, addresses)
            }
            const demoUserIdSet = new Set(userIds)
            const mockProviderByName = new Map(AUTOMOTIVE_MOCK_PROVIDERS.map((provider) => [provider.name, provider]))
            const providers = candidateProviders.filter((provider) => {
                const fixture = mockProviderByName.get(provider.name)
                if (!fixture) return false
                if (demoUserIdSet.has(provider.ownerId ?? '')) return true

                // Unowned rows are removed only when their descriptive fixture
                // and seeded branch address both match. This prevents a real,
                // unowned provider with a coincidentally equal name from being
                // mistaken for a demo row.
                return provider.ownerId === null
                    && provider.description === fixture.description
                    && (locationsByProvider.get(provider.id) ?? []).includes(fixture.address)
            })
            const providerIds = uniqueIds(providers)
            const locations = candidateLocations.filter(({ providerId }) => providerIds.includes(providerId))
            const locationIds = uniqueIds(locations)

            const autocareRequests = [
                ...(userIds.length > 0 ? await manager.query('SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = ANY($1::uuid[])', [userIds]) : []),
                ...(providerIds.length > 0 ? await manager.query('SELECT "id" FROM "autocare_service_requests" WHERE "providerId" = ANY($1::uuid[])', [providerIds]) : []),
                ...(locationIds.length > 0 ? await manager.query('SELECT "id" FROM "autocare_service_requests" WHERE "locationId" = ANY($1::uuid[])', [locationIds]) : []),
            ] as Array<{ id: string }>
            const autocareRequestIds = uniqueIds(autocareRequests)

            const chatThreads = [
                ...(userIds.length > 0 ? await manager.query('SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = ANY($1::uuid[]) OR "createdById" = ANY($1::uuid[])', [userIds]) : []),
                ...(providerIds.length > 0 ? await manager.query('SELECT "id" FROM "autocare_chat_threads" WHERE "providerId" = ANY($1::uuid[])', [providerIds]) : []),
                ...(autocareRequestIds.length > 0 ? await manager.query('SELECT "id" FROM "autocare_chat_threads" WHERE "requestId" = ANY($1::uuid[])', [autocareRequestIds]) : []),
            ] as Array<{ id: string }>
            const chatThreadIds = uniqueIds(chatThreads)

            const capacityResources = providerIds.length > 0 || locationIds.length > 0
                ? await manager.query(
                    'SELECT "id" FROM "autocare_capacity_resources" WHERE "providerId" = ANY($1::uuid[]) OR "locationId" = ANY($1::uuid[])',
                    [providerIds.length > 0 ? providerIds : locationIds],
                )
                : []
            const capacityResourceIds = uniqueIds(capacityResources as Array<{ id: string }>)

            const fleetAccounts = userIds.length > 0
                ? await manager.query('SELECT "id" FROM "autocare_fleet_accounts" WHERE "ownerId" = ANY($1::uuid[])', [userIds])
                : []
            const fleetAccountIds = uniqueIds(fleetAccounts as Array<{ id: string }>)
            const fleetVehicles = fleetAccountIds.length > 0
                ? await manager.query('SELECT "id" FROM "autocare_fleet_vehicles" WHERE "fleetId" = ANY($1::uuid[])', [fleetAccountIds])
                : []
            const fleetVehicleIds = uniqueIds(fleetVehicles as Array<{ id: string }>)

            const autocareReviews = providerIds.length > 0 || userIds.length > 0
                ? await manager.query(
                    'SELECT "id" FROM "autocare_reviews" WHERE "providerId" = ANY($1::uuid[]) OR "clientId" = ANY($1::uuid[]) OR "serviceRequestId" = ANY($1::uuid[])',
                    [providerIds.length > 0 ? providerIds : userIds],
                )
                : []
            const autocareReviewIds = uniqueIds(autocareReviews as Array<{ id: string }>)

            const bookingWhere = [
                ...(userIds.length > 0 ? [{ clientId: In(userIds) }] : []),
                ...(cabinetIds.length > 0 ? [{ cabinetId: In(cabinetIds) }] : []),
                ...(serviceIds.length > 0 ? [{ serviceId: In(serviceIds) }] : []),
            ]

            const bookings = bookingWhere.length > 0
                ? await bookingRepository.find({ where: bookingWhere })
                : []
            const bookingIds = idsOf(bookings)

            if (userIds.length > 0) {
                // Security events are immutable, but account deletion/reset
                // must detach their user reference and redact network PII.
                // The trigger accepts this exact mutation only while the
                // transaction-local privacy cleanup flag is enabled.
                await manager.query(`SELECT set_config('app.security_event_privacy_cleanup', 'on', true)`)
                await manager.query(
                    `UPDATE "security_events"
                        SET "user_id" = NULL,
                            "ip_address" = NULL,
                            "user_agent" = NULL,
                            "metadata" = (COALESCE("metadata", '{}'::jsonb) - 'ipAddress')
                                || jsonb_build_object('privacyRedactedAt', CURRENT_TIMESTAMP::text)
                      WHERE "user_id" = ANY($1::uuid[])`,
                    [userIds],
                )
                await manager.getRepository(NotificationEntity).delete({ userId: In(userIds) })
                await manager.getRepository(SecurityTokenEntity).delete({ userId: In(userIds) })
                await manager.getRepository(UserSessionEntity).delete({ userId: In(userIds) })
            }

            // Audit logs are append-only by design. Keep historical demo
            // entries instead of bypassing the database trigger; fixture
            // ownership and reset safety are preserved by deleting only
            // mutable demo-owned records below.

            const reviewWhere = [
                ...(bookingIds.length > 0 ? [{ bookingId: In(bookingIds) }] : []),
                ...(cabinetIds.length > 0 ? [{ cabinetId: In(cabinetIds) }] : []),
                ...(userIds.length > 0 ? [{ clientId: In(userIds) }] : []),
            ]

            if (reviewWhere.length > 0) {
                await manager.getRepository(ReviewEntity).delete(reviewWhere)
            }

            // AutoCare requests and supporting records are newer than the
            // original demo reset flow. Remove demo-owned rows before users;
            // the request FK intentionally uses RESTRICT so production data
            // cannot disappear accidentally when a user is removed.
            if (userIds.length > 0) {
                await manager.query(
                    'DELETE FROM "autocare_service_messages" WHERE "senderId" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_service_attachments" WHERE "uploadedById" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_chat_reports" WHERE "reporterId" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_chat_blocks" WHERE "blockerId" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_appeals" WHERE "submittedById" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_catalog_gap_requests" WHERE "requestedById" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_provider_change_requests" WHERE "requestedById" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_provider_invitations" WHERE "invitedById" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "autocare_reschedule_requests" WHERE "requestedById" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "booking_reschedule_requests" WHERE "requestedById" = ANY($1::uuid[]) OR "resolvedById" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "security_event_actions" WHERE "actor_id" = ANY($1::uuid[])',
                    [userIds],
                )
                await manager.query(
                    'DELETE FROM "security_mitigations" WHERE "created_by" = ANY($1::uuid[])',
                    [userIds],
                )
                await deleteByAny(manager, 'platform_reviews', 'clientId', userIds)
                await deleteByAny(manager, 'client_vehicles', 'userId', userIds)
                await deleteByAny(manager, 'oauth_identities', 'user_id', userIds)
                await deleteByAny(manager, 'oauth_link_requests', 'user_id', userIds)
                await deleteByAny(manager, 'account_deletion_requests', 'user_id', userIds)
            }

            // Remove AutoCare dependents before service requests/providers. All
            // predicates are scoped to fixture IDs; global markets, zones and
            // service definitions are intentionally retained for subsequent
            // idempotent seed runs.
            await deleteByAnyColumns(manager, 'autocare_service_messages', ['requestId', 'threadId', 'senderId'], [...autocareRequestIds, ...chatThreadIds, ...userIds])
            await deleteByAnyColumns(manager, 'autocare_service_attachments', ['requestId', 'threadId', 'uploadedById'], [...autocareRequestIds, ...chatThreadIds, ...userIds])
            await deleteByAnyColumns(manager, 'autocare_chat_reports', ['threadId', 'reporterId'], [...chatThreadIds, ...userIds])
            await deleteByAnyColumns(manager, 'autocare_chat_blocks', ['threadId', 'blockerId', 'blockedUserId'], [...chatThreadIds, ...userIds])
            await deleteByAny(manager, 'autocare_chat_threads', 'id', chatThreadIds)
            await deleteByAnyColumns(manager, 'autocare_capacity_reservations', ['requestId', 'resourceId', 'providerId', 'locationId'], [...autocareRequestIds, ...capacityResourceIds, ...providerIds, ...locationIds])
            await deleteByAny(manager, 'autocare_capacity_resources', 'id', capacityResourceIds)
            await deleteByAnyColumns(manager, 'autocare_reschedule_requests', ['requestId', 'requestedById', 'resolvedById'], [...autocareRequestIds, ...userIds])
            await deleteByAny(manager, 'autocare_repair_events', 'requestId', autocareRequestIds)
            await deleteByAnyColumns(manager, 'autocare_service_quotes', ['requestId', 'providerId'], [...autocareRequestIds, ...providerIds])
            await deleteByAnyColumns(manager, 'autocare_review_promos', ['providerId', 'reviewId', 'clientId', 'serviceRequestId', 'redeemedById'], [...providerIds, ...autocareReviewIds, ...userIds, ...autocareRequestIds])
            await deleteByAnyColumns(manager, 'autocare_reviews', ['providerId', 'clientId', 'serviceRequestId'], [...providerIds, ...userIds, ...autocareRequestIds])
            await deleteByAnyColumns(manager, 'autocare_guarantee_claims', ['requestId', 'clientId', 'providerId', 'resolvedById'], [...autocareRequestIds, ...userIds, ...providerIds])
            await deleteByAny(manager, 'autocare_broadcast_offers', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_broadcast_requests', 'clientId', userIds)
            await deleteByAnyColumns(manager, 'autocare_expert_questions', ['clientId', 'answeredById'], userIds)
            await deleteByAnyColumns(manager, 'autocare_appeals', ['submittedById', 'decidedById', 'providerId'], [...userIds, ...providerIds])
            await deleteByAnyColumns(manager, 'autocare_catalog_gap_requests', ['requestedById', 'reviewedById', 'providerId'], [...userIds, ...providerIds])
            await deleteByAnyColumns(manager, 'autocare_provider_change_requests', ['requestedById', 'reviewedById', 'providerId'], [...userIds, ...providerIds])
            await deleteByAnyColumns(manager, 'autocare_provider_invitations', ['invitedById', 'providerId', 'locationId'], [...userIds, ...providerIds, ...locationIds])
            await deleteByAny(manager, 'autocare_provider_favorites', 'userId', userIds)
            await deleteByAny(manager, 'autocare_provider_daily_metrics', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_trust_snapshots', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_trust_evidence', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_bonus_ledger', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_bonus_accounts', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_bonus_programs', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_provider_memberships', 'providerId', providerIds)
            await deleteByAny(manager, 'autocare_fleet_vehicles', 'id', fleetVehicleIds)
            await deleteByAny(manager, 'autocare_fleet_accounts', 'id', fleetAccountIds)
            await deleteByAny(manager, 'autocare_service_requests', 'id', autocareRequestIds)
            await deleteByAny(manager, 'autocare_service_offerings', 'locationId', locationIds)
            await deleteByAny(manager, 'autocare_service_locations', 'id', locationIds)
            await deleteByAny(manager, 'autocare_providers', 'id', providerIds)

            if (bookingIds.length > 0) {
                await manager.query('DELETE FROM "booking_status_history" WHERE "bookingId" = ANY($1::uuid[])', [bookingIds])
                await manager.query('DELETE FROM "booking_reschedule_requests" WHERE "bookingId" = ANY($1::uuid[])', [bookingIds])
                await bookingRepository.delete({ id: In(bookingIds) })
            }

            if (serviceIds.length > 0) {
                await serviceRepository.delete({ id: In(serviceIds) })
            }

            if (cabinetIds.length > 0) {
                await cabinetRepository.delete({ id: In(cabinetIds) })
            }

            if (userIds.length > 0) {
                await userRepository.delete({ id: In(userIds) })
            }

            console.info('Demo data reset successfully.')
        })
    } finally {
        await AppDataSource.destroy()
    }
}

resetDemoData().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
