import { Between, In, ObjectLiteral, Repository, type FindOptionsWhere } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import {
    AutomotiveProviderEntity,
    AutomotiveServiceDefinitionEntity,
    AutomotiveServiceLocationEntity,
} from '../../entities/automotive/automotive.entity.js'
import { ServiceAttachmentEntity, ServiceRequestEntity, ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'
import { SecurityTokenEntity } from '../../entities/security-token/security-token.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AuditLogEntity } from '../../entities/audit-log/audit-log.entity.js'
import { SecurityEventEntity } from '../../entities/security-event/security-event.entity.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../entities/outbox/outbox-event.entity.js'
import { OAuthLinkRequestEntity } from '../../entities/oauth-link-request/oauth-link-request.entity.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { env } from '../../config/env.js'
import { cleanupOrphanedCabinetImages } from '../cabinets/cabinet-image-storage.js'
import { cleanupOrphanedAutoCareProviderLogos } from '../autocare/autocare-provider-logo-storage.js'
import { cleanupOrphanedAutoCareProviderMedia } from '../autocare/autocare-provider-media-storage.js'
import {
    cleanupExpiredAutoCareAttachments,
    cleanupOrphanedAutoCareAttachmentObjects,
} from '../autocare/autocare-attachment-storage.js'
import { addDays, zonedDateTimeToInstant } from '../../shared/date-time/cabinet-timezone.js'
import { enqueueOutboxEvent, processOutboxBatch } from '../outbox/outbox.service.js'
import { enqueueNotification } from '../outbox/notification-outbox.service.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { shouldDeliverNotification } from '../notifications/notification-preferences.js'
import type { Mailer } from '../../shared/mail/mailer.js'
import type { MaintenanceLease } from './maintenance-lease.service.js'
import { metrics } from '../../shared/observability/metrics.js'
import { getNotificationRetentionCutoff } from '../notifications/notification-retention.js'
import { getRevokedSessionRetentionCutoff } from '../auth/session-retention.js'
import {
    getPrivacyRedactedSecurityEventMetadata,
    getSecurityEventPrivacyCutoff,
} from '../admin/security-event-retention-policy.js'
import { boundMaintenanceSummaryCount } from './maintenance-summary-policy.js'
import {
    assertMaintenanceReferenceCount,
    MAX_MAINTENANCE_REMINDER_CANDIDATES,
} from './maintenance-batch-policy.js'
import {
    getBookingReminderDateRangeDays,
    getBookingReminderWindowMs,
} from './booking-reminder-policy.js'
import { getMaintenanceDeleteBatchSize } from './maintenance-cleanup-policy.js'
import { getAccountDeletionRetentionCutoff } from '../users/account-deletion-retention.js'
import { getOutboxHealthSummary } from '../outbox/outbox-health.service.js'
import { getMaintenanceBacklogAgeMs } from './maintenance-backlog-policy.js'
import { reassessAutoCareTrustScores } from '../autocare/trust-score.service.js'
import { expireAutoCareServiceQuotes } from '../autocare/quote-expiry.service.js'
import {
    runMaintenancePhaseWithFailurePolicy,
    type MaintenancePhase,
    type MaintenancePhaseFailure,
} from './maintenance-phase.js'

export type MaintenanceCycleResult = {
    remindersScheduled: number
    quoteExpiry?: {
        expired: number
        requestsReopened: number
    }
    outbox: {
        claimed: number
        completed: number
        failed: number
        abandoned: number
        deadLetter: number
        secretsRedacted: number
    }
    authCleanup: {
        tokens: number
        sessions: number
        oauthLinkRequests: number
        accountDeletionRequests: number
    }
    auditCleanup: {
        auditLogs: number
        securityEvents: number
    }
    notificationCleanup: {
        notifications: number
    }
    orphanImageCleanup: {
        failed: number
        scanned: number
        removed: number
    }
    trustReassessment: {
        scanned: number
        changed: number
    }
    phaseFailures: MaintenancePhaseFailure[]
}

export function summarizeMaintenanceCycle(result: MaintenanceCycleResult) {
    const count = boundMaintenanceSummaryCount
    return {
        remindersScheduled: count(result.remindersScheduled),
        ...(result.quoteExpiry ? { quoteExpiry: Object.fromEntries(Object.entries(result.quoteExpiry).map(([key, value]) => [key, count(value)])) } : {}),
        outbox: Object.fromEntries(Object.entries(result.outbox).map(([key, value]) => [key, count(value)])),
        authCleanup: Object.fromEntries(Object.entries(result.authCleanup).map(([key, value]) => [key, count(value)])),
        auditCleanup: Object.fromEntries(Object.entries(result.auditCleanup).map(([key, value]) => [key, count(value)])),
        notificationCleanup: Object.fromEntries(Object.entries(result.notificationCleanup).map(([key, value]) => [key, count(value)])),
        orphanImageCleanup: Object.fromEntries(Object.entries(result.orphanImageCleanup).map(([key, value]) => [key, count(value)])),
        trustReassessment: Object.fromEntries(Object.entries(result.trustReassessment).map(([key, value]) => [key, count(value)])),
    }
}

type ExpiringRecord = ObjectLiteral & {
    id: string
    expiresAt: Date
}

export function selectExpiredRecordIds(
    rows: Array<{ id: string }>,
    batchSize: number,
) {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
        throw new Error('Auth cleanup batch size must be a positive integer.')
    }

    return rows.slice(0, batchSize).map((row) => row.id)
}

export async function deleteExpiredEntityBatch<T extends ExpiringRecord>(
    repository: Repository<T>,
    now: Date,
    batchSize: number,
) {
    const expiresAtColumn = repository.metadata.findColumnWithPropertyName('expiresAt')
    if (!expiresAtColumn) {
        throw new Error(`Entity ${repository.metadata.name} must define an expiresAt column.`)
    }
    const expiresAtSql = `record."${expiresAtColumn.databaseName.replaceAll('"', '""')}"`

    const rows = await repository
        .createQueryBuilder('record')
        .select('record.id', 'id')
        .where(`${expiresAtSql} < :now`, { now })
        .orderBy(expiresAtSql, 'ASC')
        .take(batchSize)
        .getRawMany<{ id: string }>()

    if (rows.length === 0) return 0

    const result = await repository.delete(
        { id: In(selectExpiredRecordIds(rows, batchSize)) } as FindOptionsWhere<T>,
    )
    return result.affected ?? 0
}

export async function deleteRevokedSessionBatch(now: Date, batchSize: number) {
    const repository = AppDataSource.getRepository(UserSessionEntity)
    const cutoff = getRevokedSessionRetentionCutoff(now)
    const rows = await repository
        .createQueryBuilder('session')
        .select('session.id', 'id')
        .where('session.revokedAt IS NOT NULL')
        .andWhere('session.revokedAt < :cutoff', { cutoff })
        .orderBy('session.revokedAt', 'ASC')
        .take(batchSize)
        .getRawMany<{ id: string }>()

    if (rows.length === 0) return 0
    const result = await repository.delete({ id: In(selectExpiredRecordIds(rows, batchSize)) })
    return result.affected ?? 0
}

export async function scheduleBookingReminders(
    now = new Date(),
    assertLease?: MaintenanceLease['assertHeld'],
) {
    const utcDate = now.toISOString().slice(0, 10)
    const reminderWindowMs = getBookingReminderWindowMs(env.bookingReminderHours)
    const bookings = await AppDataSource.getRepository(BookingEntity).find({
        where: {
            date: Between(
                addDays(utcDate, -1),
                addDays(utcDate, getBookingReminderDateRangeDays(env.bookingReminderHours)),
            ),
            status: In([BookingStatus.Pending, BookingStatus.Confirmed]),
        },
        relations: { cabinet: true },
        take: MAX_MAINTENANCE_REMINDER_CANDIDATES,
        order: { date: 'ASC', startTime: 'ASC', createdAt: 'ASC' },
    })
    let scheduled = 0

    for (const booking of bookings) {
        assertLease?.()
        const startsAt = zonedDateTimeToInstant(
            booking.date,
            booking.startTime,
            booking.cabinet.timezone,
        )
        const remainingMs = startsAt.getTime() - now.getTime()
        if (remainingMs <= 0 || remainingMs > reminderWindowMs) continue

        await enqueueOutboxEvent({
            type: 'booking.reminder',
            idempotencyKey: `booking-reminder:${booking.id}:${booking.date}:${booking.startTime.slice(0, 5)}`,
            payload: {
                bookingId: booking.id,
                cabinetTitle: booking.cabinet.title,
                date: booking.date,
                startTime: booking.startTime.slice(0, 5),
                userId: booking.clientId,
            },
        })
        scheduled += 1
    }

    metrics.setGauge('maintenance_reminders_last_scheduled', scheduled)
    metrics.increment('maintenance_reminders_scheduled_total', scheduled)

    return scheduled
}

export async function scheduleAutoCareReminders(
    now = new Date(),
    assertLease?: MaintenanceLease['assertHeld'],
) {
    const reminderWindowMs = getBookingReminderWindowMs(env.bookingReminderHours)
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({
        where: {
            preferredAt: Between(
                new Date(now.getTime() + 60_000),
                new Date(now.getTime() + reminderWindowMs),
            ),
            status: ServiceRequestStatus.Accepted,
        },
        take: MAX_MAINTENANCE_REMINDER_CANDIDATES,
        order: { preferredAt: 'ASC', createdAt: 'ASC' },
    })
    const clientIds = [...new Set(requests.map((request) => request.clientId))]
    const providerIds = [...new Set(requests.map((request) => request.providerId))]
    const definitionIds = [...new Set(requests.map((request) => request.definitionId))]
    const locationIds = [...new Set(requests.map((request) => request.locationId))]
    const [clients, providers, definitions, locations] = await Promise.all([
        AppDataSource.getRepository(UserEntity).findBy({ id: In(clientIds) }),
        AppDataSource.getRepository(AutomotiveProviderEntity).findBy({ id: In(providerIds) }),
        AppDataSource.getRepository(AutomotiveServiceDefinitionEntity).findBy({ id: In(definitionIds) }),
        AppDataSource.getRepository(AutomotiveServiceLocationEntity).findBy({ id: In(locationIds) }),
    ])
    const clientsById = new Map(clients.map((client) => [client.id, client]))
    const providersById = new Map(providers.map((provider) => [provider.id, provider]))
    const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]))
    const locationsById = new Map(locations.map((location) => [location.id, location]))
    let scheduled = 0

    for (const request of requests) {
        assertLease?.()
        if (!request.preferredAt) continue
        const client = clientsById.get(request.clientId)
        const provider = providersById.get(request.providerId)
        const definition = definitionsById.get(request.definitionId)
        const location = locationsById.get(request.locationId)
        if (!client || !provider || !definition || !location) continue
        await enqueueNotification({
            userId: request.clientId,
            category: NotificationCategory.Booking,
            template: { key: 'autocare.visit_reminder' },
            link: `/profile/bookings?request=${request.id}`,
            metadata: { requestId: request.id, preferredAt: request.preferredAt.toISOString(), domain: 'autocare' },
        }, `autocare-reminder:${request.id}:${request.preferredAt.toISOString()}`)
        if (shouldDeliverNotification(NotificationCategory.Booking, client, 'email')) {
            const visit = formatAutoCareReminderVisit(request.preferredAt, client.locale ?? 'en', location.timezone)
            await enqueueOutboxEvent({
                type: 'email.send',
                idempotencyKey: `email:autocare-reminder:${request.id}:${request.preferredAt.toISOString()}`,
                payload: {
                    template: 'autocare_visit_reminder',
                    requestId: request.id,
                    toEmail: client.email,
                    recipientName: client.name,
                    providerName: provider.name,
                    serviceTitle: definition.labels[client.locale ?? 'en'] ?? definition.labels.en ?? definition.slug,
                    date: visit.date,
                    startTime: visit.startTime,
                    frontendOrigin: env.frontendOrigin,
                    locale: client.locale,
                },
            })
        }
        scheduled += 1
    }

    metrics.setGauge('maintenance_autocare_reminders_last_scheduled', scheduled)
    metrics.increment('maintenance_autocare_reminders_scheduled_total', scheduled)
    return scheduled
}

function formatAutoCareReminderVisit(
    startsAt: Date,
    locale: string,
    timezone: string,
) {
    const date = new Intl.DateTimeFormat(locale, {
        dateStyle: 'long',
        timeZone: timezone,
    }).format(startsAt)
    const startTime = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: timezone,
    }).format(startsAt)

    return { date, startTime }
}

export async function cleanupExpiredAuthData(now = new Date()) {
    metrics.setGauge('maintenance_cleanup_batch_size', env.authCleanupBatchSize, { resource: 'auth' })

    const [tokens, expiredSessions, revokedSessions, oauthLinkRequests, accountDeletionRequests] = await Promise.all([
        deleteExpiredEntityBatch(
            AppDataSource.getRepository(SecurityTokenEntity),
            now,
            env.authCleanupBatchSize,
        ),
        deleteExpiredEntityBatch(
            AppDataSource.getRepository(UserSessionEntity),
            now,
            env.authCleanupBatchSize,
        ),
        deleteRevokedSessionBatch(now, env.authCleanupBatchSize),
        deleteExpiredEntityBatch(
            AppDataSource.getRepository(OAuthLinkRequestEntity),
            now,
            env.authCleanupBatchSize,
        ),
        deleteExpiredAccountDeletionRequestBatch(now, env.authCleanupBatchSize),
    ])
    const sessions = expiredSessions + revokedSessions
    const result = { tokens, sessions, oauthLinkRequests, accountDeletionRequests }
    metrics.setGauge('maintenance_cleanup_last_deleted', result.tokens, { resource: 'security_tokens' })
    metrics.setGauge('maintenance_cleanup_last_deleted', result.sessions, { resource: 'user_sessions' })
    metrics.increment('maintenance_cleanup_deleted_total', result.tokens, { resource: 'security_tokens' })
    metrics.increment('maintenance_cleanup_deleted_total', result.sessions, { resource: 'user_sessions' })
    metrics.setGauge('maintenance_cleanup_last_deleted', result.oauthLinkRequests, { resource: 'oauth_link_requests' })
    metrics.increment('maintenance_cleanup_deleted_total', result.oauthLinkRequests, { resource: 'oauth_link_requests' })
    metrics.setGauge('maintenance_cleanup_last_deleted', result.accountDeletionRequests, { resource: 'account_deletion_requests' })
    metrics.increment('maintenance_cleanup_deleted_total', result.accountDeletionRequests, { resource: 'account_deletion_requests' })

    return result
}

export async function deleteExpiredAccountDeletionRequestBatch(now: Date, batchSize: number) {
    const repository = AppDataSource.getRepository(AccountDeletionRequestEntity)
    const rows = await repository
        .createQueryBuilder('request')
        .select('request.id', 'id')
        .where('request.status IN (:...statuses)', {
            statuses: [AccountDeletionRequestStatus.Cancelled, AccountDeletionRequestStatus.Completed],
        })
        .andWhere('request.requestedAt < :cutoff', {
            cutoff: getAccountDeletionRetentionCutoff(now),
        })
        .orderBy('request.requestedAt', 'ASC')
        .take(batchSize)
        .getRawMany<{ id: string }>()

    if (rows.length === 0) return 0

    const result = await repository.delete({ id: In(selectExpiredRecordIds(rows, batchSize)) })
    return result.affected ?? 0
}

export async function redactExpiredOutboxSecrets(now = new Date()) {
    const rows = await AppDataSource.query(`
        WITH candidates AS (
            SELECT event."id"
            FROM "outbox_events" event
            WHERE event."type" = 'email.send'
              AND event."status" IN ('failed', 'dead_letter')
              AND (event."payload" ? 'token' OR event."payload" ? 'encryptedToken')
              AND (
                  event."status" = 'dead_letter'
                  OR (
                      event."payload"->>'expiresAt' IS NOT NULL
                      AND event."payload"->>'expiresAt' <= $1
                  )
              )
            ORDER BY event."createdAt" ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED
        )
        UPDATE "outbox_events" event
        SET "payload" = event."payload" - 'token' - 'encryptedToken'
        FROM candidates
        WHERE event."id" = candidates."id"
        RETURNING event."id"
    `, [now.toISOString(), getMaintenanceDeleteBatchSize()]) as Array<{ id: string }>

    const redacted = rows.length
    metrics.setGauge('maintenance_outbox_secrets_redacted_last', redacted)
    metrics.increment('maintenance_outbox_secrets_redacted_total', redacted)
    return redacted
}

const activeOutboxStatuses = [
    OutboxEventStatus.Pending,
    OutboxEventStatus.Processing,
    OutboxEventStatus.Failed,
]

export async function measureMaintenanceOutboxBacklog(now = Date.now()) {
    const repository = AppDataSource.getRepository(OutboxEventEntity)
    const [active, deadLetter, oldest] = await Promise.all([
        repository.count({ where: { status: In(activeOutboxStatuses) } }),
        repository.countBy({ status: OutboxEventStatus.DeadLetter }),
        repository
            .createQueryBuilder('event')
            .select('event.createdAt', 'createdAt')
            .where('event.status IN (:...statuses)', { statuses: activeOutboxStatuses })
            .orderBy('event.createdAt', 'ASC')
            .getRawOne<{ createdAt: Date | string } | undefined>(),
    ])
    const summary = getOutboxHealthSummary({
        pending: active,
        deadLetter,
        oldestCreatedAt: oldest?.createdAt,
    }, now)

    metrics.setGauge('maintenance_outbox_active', summary.pending)
    metrics.setGauge('maintenance_outbox_dead_letter', summary.deadLetter)
    metrics.setGauge(
        'maintenance_outbox_oldest_age_ms',
        getMaintenanceBacklogAgeMs(oldest?.createdAt, now),
    )
    return summary
}

export async function cleanupExpiredAuditLogs(now = new Date()) {
    const retentionBefore = new Date(
        now.getTime() - env.auditLogRetentionDays * 24 * 60 * 60 * 1000,
    )
    const privacyBefore = getSecurityEventPrivacyCutoff(now, env.securityEventIpRetentionDays)
    const result = await AppDataSource.transaction(async (manager) => {
        await manager.query(`SELECT set_config('app.audit_retention_cleanup', 'on', true)`)
        await manager.query(`SELECT set_config('app.security_event_retention_cleanup', 'on', true)`)
        await manager.query(`SELECT set_config('app.security_event_privacy_cleanup', 'on', true)`)
        const repository = manager.getRepository(AuditLogEntity)
        const rows = await repository
            .createQueryBuilder('audit')
            .select('audit.id', 'id')
            .where('audit.createdAt < :retentionBefore', { retentionBefore })
            .orderBy('audit.createdAt', 'ASC')
            .take(getMaintenanceDeleteBatchSize())
            .getRawMany<{ id: string }>()
        const auditResult = rows.length === 0
            ? { affected: 0 }
            : await repository.delete({ id: In(rows.map((row) => row.id)) })
        const securityEventRepository = manager.getRepository(SecurityEventEntity)
        const privacyRows = await securityEventRepository
            .createQueryBuilder('securityEvent')
            .select('securityEvent.id', 'id')
            .where('securityEvent.createdAt < :privacyBefore', { privacyBefore })
            .andWhere('securityEvent.createdAt >= :retentionBefore', { retentionBefore })
            .andWhere(`(
                securityEvent.ipAddress IS NOT NULL
                OR securityEvent.userAgent IS NOT NULL
                OR securityEvent.metadata ? :ipAddressMetadataKey
            )`, { ipAddressMetadataKey: 'ipAddress' })
            .orderBy('securityEvent.createdAt', 'ASC')
            .take(getMaintenanceDeleteBatchSize())
            .getRawMany<{ id: string }>()
        if (privacyRows.length > 0) {
            await securityEventRepository.update(
                { id: In(privacyRows.map((row) => row.id)) },
                {
                    ipAddress: null,
                    userAgent: null,
                    metadata: getPrivacyRedactedSecurityEventMetadata(now),
                },
            )
        }
        const securityEventRows = await securityEventRepository
            .createQueryBuilder('securityEvent')
            .select('securityEvent.id', 'id')
            .where('securityEvent.createdAt < :retentionBefore', { retentionBefore })
            .orderBy('securityEvent.createdAt', 'ASC')
            .take(getMaintenanceDeleteBatchSize())
            .getRawMany<{ id: string }>()
        const securityEventResult = securityEventRows.length === 0
            ? { affected: 0 }
            : await securityEventRepository.delete({ id: In(securityEventRows.map((row) => row.id)) })

        return {
            auditLogs: auditResult.affected ?? 0,
            securityEvents: securityEventResult.affected ?? 0,
            securityEventsRedacted: privacyRows.length,
        }
    })

    const auditLogs = result.auditLogs
    const securityEvents = result.securityEvents
    metrics.setGauge('maintenance_cleanup_last_deleted', auditLogs, { resource: 'audit_logs' })
    metrics.increment('maintenance_cleanup_deleted_total', auditLogs, { resource: 'audit_logs' })
    metrics.setGauge('maintenance_cleanup_last_deleted', securityEvents, { resource: 'security_events' })
    metrics.increment('maintenance_cleanup_deleted_total', securityEvents, { resource: 'security_events' })
    metrics.setGauge('maintenance_security_event_privacy_redactions_last', result.securityEventsRedacted)
    metrics.increment('maintenance_security_event_privacy_redactions_total', result.securityEventsRedacted)

    return { auditLogs, securityEvents }
}

export async function cleanupExpiredNotifications(now = new Date()) {
    const repository = AppDataSource.getRepository(NotificationEntity)
    const rows = await repository
        .createQueryBuilder('notification')
        .select('notification.id', 'id')
        .where('notification.createdAt < :retentionBefore', {
            retentionBefore: getNotificationRetentionCutoff(now, env.notificationRetentionDays),
        })
        .orderBy('notification.createdAt', 'ASC')
        .take(getMaintenanceDeleteBatchSize())
        .getRawMany<{ id: string }>()
    const result = rows.length === 0
        ? { affected: 0 }
        : await repository.delete({ id: In(rows.map((row) => row.id)) })
    const notifications = result.affected ?? 0
    metrics.setGauge('maintenance_cleanup_last_deleted', notifications, { resource: 'notifications' })
    metrics.increment('maintenance_cleanup_deleted_total', notifications, { resource: 'notifications' })
    return { notifications }
}

export async function cleanupOrphanedCabinetImageFiles(now = new Date()) {
    const cabinets = await AppDataSource.getRepository(CabinetEntity).find({
        select: { photos: true },
    })
    const referencedPhotoUrls = cabinets.flatMap((cabinet) => cabinet.photos ?? [])
    assertMaintenanceReferenceCount(referencedPhotoUrls.length)

    const result = await cleanupOrphanedCabinetImages({
        referencedPhotoUrls,
        now,
        gracePeriodMs: env.cabinetUploadOrphanGraceHours * 60 * 60 * 1000,
    })

    metrics.setGauge('maintenance_orphan_images_scanned', result.scanned)
    metrics.setGauge('maintenance_orphan_images_removed', result.removed)
    metrics.setGauge('maintenance_orphan_images_failed', result.failed)
    metrics.increment('maintenance_orphan_image_cleanup_total', result.removed, { outcome: 'removed' })
    metrics.increment('maintenance_orphan_image_cleanup_total', result.failed, { outcome: 'failed' })

    const providers = await AppDataSource.getRepository(AutomotiveProviderEntity).find({
        select: { logoUrl: true, coverImageUrl: true, galleryImageUrls: true },
    })
    const providerReferences = providers.flatMap((provider) => [
        provider.logoUrl,
        provider.coverImageUrl,
        ...provider.galleryImageUrls,
    ].filter((value): value is string => Boolean(value)))
    assertMaintenanceReferenceCount(providerReferences.length)
    const gracePeriodMs = env.cabinetUploadOrphanGraceHours * 60 * 60 * 1000
    const [logoCleanup, coverCleanup, galleryCleanup] = await Promise.all([
        cleanupOrphanedAutoCareProviderLogos({ referencedUrls: providerReferences, now, gracePeriodMs }),
        cleanupOrphanedAutoCareProviderMedia({ kind: 'cover', referencedUrls: providerReferences, now, gracePeriodMs }),
        cleanupOrphanedAutoCareProviderMedia({ kind: 'gallery', referencedUrls: providerReferences, now, gracePeriodMs }),
    ])
    const autoCareScanned = logoCleanup.scanned + coverCleanup.scanned + galleryCleanup.scanned
    const autoCareRemoved = logoCleanup.removed + coverCleanup.removed + galleryCleanup.removed
    const autoCareFailed = logoCleanup.failed + coverCleanup.failed + galleryCleanup.failed
    metrics.setGauge('maintenance_autocare_orphan_media_scanned', autoCareScanned)
    metrics.setGauge('maintenance_autocare_orphan_media_removed', autoCareRemoved)
    metrics.setGauge('maintenance_autocare_orphan_media_failed', autoCareFailed)
    metrics.increment('maintenance_autocare_orphan_media_cleanup_total', autoCareRemoved, { outcome: 'removed' })
    metrics.increment('maintenance_autocare_orphan_media_cleanup_total', autoCareFailed, { outcome: 'failed' })

    const attachmentReferences = await AppDataSource.getRepository(ServiceAttachmentEntity).find({
        select: { objectKey: true },
    })
    assertMaintenanceReferenceCount(attachmentReferences.length)
    const attachmentCleanup = await cleanupOrphanedAutoCareAttachmentObjects({
        referencedKeys: attachmentReferences.map((attachment) => attachment.objectKey),
        now,
        gracePeriodMs,
    })
    metrics.setGauge('maintenance_autocare_attachment_objects_scanned', attachmentCleanup.scanned)
    metrics.setGauge('maintenance_autocare_attachment_objects_removed', attachmentCleanup.removed)
    metrics.setGauge('maintenance_autocare_attachment_objects_failed', attachmentCleanup.failed)
    metrics.increment('maintenance_autocare_attachment_cleanup_total', attachmentCleanup.removed, { outcome: 'removed' })
    metrics.increment('maintenance_autocare_attachment_cleanup_total', attachmentCleanup.failed, { outcome: 'failed' })

    const attachmentRetention = await cleanupExpiredAutoCareAttachments({
        now,
        retentionDays: env.autoCareAttachments.retentionDays,
        batchSize: getMaintenanceDeleteBatchSize(),
    })
    metrics.setGauge('maintenance_autocare_attachment_retention_scanned', attachmentRetention.scanned)
    metrics.setGauge('maintenance_autocare_attachment_retention_removed', attachmentRetention.removed)
    metrics.setGauge('maintenance_autocare_attachment_retention_failed', attachmentRetention.failed)
    metrics.increment('maintenance_autocare_attachment_retention_total', attachmentRetention.removed, { outcome: 'removed' })
    metrics.increment('maintenance_autocare_attachment_retention_total', attachmentRetention.failed, { outcome: 'failed' })

    return result
}

export async function runMaintenanceCycle(
    now = new Date(),
    mailer?: Mailer,
    lease?: MaintenanceLease,
): Promise<MaintenanceCycleResult> {
    const startedAt = Date.now()
    metrics.increment('maintenance_cycles_started_total')

    try {
        const phaseFailures: MaintenancePhaseFailure[] = []
        const runPhase = async <T>(
            phase: MaintenancePhase,
            task: () => Promise<T>,
            fallback: T,
        ): Promise<T> => {
            const outcome = await runMaintenancePhaseWithFailurePolicy({
                phase,
                task,
                assertLease: lease?.assertHeld,
                timeoutMs: env.backgroundJobPhaseTimeoutMs,
            })
            if (outcome.ok) return outcome.value
            phaseFailures.push(outcome.failure)
            return fallback
        }
        const remindersScheduled = await runPhase(
            'reminders',
            async () => {
                const bookingReminders = await scheduleBookingReminders(now, lease?.assertHeld)
                const autoCareReminders = await scheduleAutoCareReminders(now, lease?.assertHeld)
                return bookingReminders + autoCareReminders
            },
            0,
        )
        const quoteExpiry = await runPhase(
            'quote_expiry',
            () => expireAutoCareServiceQuotes(now),
            { expired: 0, requestsReopened: 0 },
        )
        const outbox = await runPhase('outbox', async () => {
                await measureMaintenanceOutboxBacklog(now.getTime())
                const result = await processOutboxBatch(mailer, lease?.assertHeld)
                const secretsRedacted = await redactExpiredOutboxSecrets(now)
                await measureMaintenanceOutboxBacklog(now.getTime())
                return { ...result, secretsRedacted }
            },
            { claimed: 0, completed: 0, failed: 0, abandoned: 0, deadLetter: 0, secretsRedacted: 0 },
        )
        const authCleanup = await runPhase('auth_cleanup', () => cleanupExpiredAuthData(now), {
            tokens: 0,
            sessions: 0,
            oauthLinkRequests: 0,
            accountDeletionRequests: 0,
        })
        const auditCleanup = await runPhase('audit_cleanup', () => cleanupExpiredAuditLogs(now), {
            auditLogs: 0,
            securityEvents: 0,
        })
        const notificationCleanup = await runPhase(
            'notification_cleanup',
            () => cleanupExpiredNotifications(now),
            { notifications: 0 },
        )
        const orphanImageCleanup = await runPhase(
            'orphan_image_cleanup',
            () => cleanupOrphanedCabinetImageFiles(now),
            { failed: 0, scanned: 0, removed: 0 },
        )
        const trustReassessment = await runPhase(
            'trust_reassessment',
            () => reassessAutoCareTrustScores(),
            { scanned: 0, changed: 0 },
        )
        const outcome = phaseFailures.length > 0 ? 'partial' : 'success'
        metrics.increment('maintenance_cycles_completed_total', 1, { outcome })
        metrics.setGauge(
            phaseFailures.length > 0
                ? 'maintenance_last_partial_at_ms'
                : 'maintenance_last_success_at_ms',
            Date.now(),
        )

        return {
            remindersScheduled,
            quoteExpiry,
            outbox,
            authCleanup,
            auditCleanup,
            notificationCleanup,
            orphanImageCleanup,
            trustReassessment,
            phaseFailures,
        }
    } catch (error) {
        metrics.increment('maintenance_cycles_completed_total', 1, { outcome: 'failed' })
        metrics.setGauge('maintenance_last_failure_at_ms', Date.now())
        throw error
    } finally {
        metrics.observe('maintenance_cycle_duration_ms', Date.now() - startedAt)
    }
}
