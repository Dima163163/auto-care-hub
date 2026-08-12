import { In, MoreThanOrEqual, type EntityManager } from 'typeorm'
import { z } from 'zod'

import { AppDataSource } from '../../database/data-source.js'
import { NotificationCategory } from '../../entities/notification/notification.entity.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../entities/outbox/outbox-event.entity.js'
import { createNotification } from '../notifications/notifications.service.js'
import type { Mailer } from '../../shared/mail/mailer.js'
import { createPasswordResetEmail } from '../../shared/mail/password-reset-email.js'
import { createEmailVerificationEmail } from '../../shared/mail/email-verification-email.js'
import { createPasswordSetupEmail } from '../../shared/mail/password-setup-email.js'
import { createBookingEmail } from '../../shared/mail/booking-email.js'
import { SUPPORTED_LOCALES } from '../../config/i18n.js'
import { serializeError } from '../../shared/observability/logger.js'
import { assertOutboxPayloadWithinBounds } from './outbox-payload.js'
import { getOutboxFailureDisposition } from './outbox-dead-letter.js'
import { assertSupportedOutboxEventType } from './outbox-event-registry.js'
import { getStaleOutboxRecoveryStatus } from './outbox-lease.js'
import { getOutboxRetryDelayMs } from './outbox-retry-policy.js'
import { normalizeOutboxIdempotencyKey } from './outbox-idempotency-policy.js'
import { getOutboxBatchSize } from './outbox-batch-policy.js'
import { assertOutboxAvailableAt } from './outbox-schedule-policy.js'
import {
    MAX_OUTBOX_EMAIL_TITLE_LENGTH,
    MAX_OUTBOX_RECIPIENT_NAME_LENGTH,
    normalizeOutboxEmailText,
} from './outbox-email-policy.js'
import { normalizeFrontendOrigin } from '../../shared/security/frontend-origin-policy.js'
import { normalizeEmailAddress } from '../../shared/mail/email-address-policy.js'
import { normalizeNotificationLink } from '../notifications/notification-link-policy.js'
import { normalizeOutboxErrorMessage } from './outbox-error-policy.js'
import { renderNotificationTemplate } from '../notifications/notification-renderer.js'
import { decryptOutboxSecret, redactOutboxSecrets } from './outbox-secret.js'

export const OUTBOX_MAX_ATTEMPTS = 5
export { MAX_OUTBOX_ERROR_LENGTH as OUTBOX_MAX_ERROR_LENGTH } from './outbox-error-policy.js'
const BATCH_SIZE = getOutboxBatchSize()
const STALE_LOCK_MS = 10 * 60_000

export function normalizeOutboxError(error: unknown) {
    const message = serializeError(error).message ?? 'Unknown outbox error'
    return normalizeOutboxErrorMessage(message)
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

const bookingReminderPayloadSchema = z.object({
    bookingId: z.string().uuid(),
    cabinetTitle: z.string().min(1),
    date: isoDateSchema,
    startTime: timeSchema,
    userId: z.string().uuid(),
})

const notificationPayloadSchema = z.object({
    userId: z.string().uuid(),
    category: z.enum(NotificationCategory),
    title: z.string().min(1),
    message: z.string().min(1),
    link: z.string().nullable().transform((value) => normalizeNotificationLink(value)),
    metadata: z.record(z.string(), z.unknown()),
})

const emailPayloadSchema = z.discriminatedUnion('template', [
    z.object({
        template: z.literal('password_reset'),
        email: z.string().transform(normalizeEmailAddress),
        expiresAt: z.string().datetime(),
        frontendOrigin: z.string().transform((value) => normalizeFrontendOrigin(value, { allowHttpLoopback: true })),
        encryptedToken: z.string().min(32),
        locale: z.enum(SUPPORTED_LOCALES).nullable(),
    }),
    z.object({
        template: z.literal('email_verification'),
        email: z.string().transform(normalizeEmailAddress),
        expiresAt: z.string().datetime(),
        frontendOrigin: z.string().transform((value) => normalizeFrontendOrigin(value, { allowHttpLoopback: true })),
        encryptedToken: z.string().min(32),
        locale: z.enum(SUPPORTED_LOCALES).nullable(),
    }),
    z.object({
        template: z.literal('password_setup'),
        email: z.string().transform(normalizeEmailAddress),
        expiresAt: z.string().datetime(),
        frontendOrigin: z.string().transform((value) => normalizeFrontendOrigin(value, { allowHttpLoopback: true })),
        encryptedToken: z.string().min(32),
        locale: z.enum(SUPPORTED_LOCALES).nullable(),
    }),
    z.object({
        template: z.literal('booking'),
        bookingId: z.string().uuid(),
        toEmail: z.string().transform(normalizeEmailAddress),
    recipientName: z.string().min(1).max(MAX_OUTBOX_RECIPIENT_NAME_LENGTH).transform((value) =>
        normalizeOutboxEmailText(value, MAX_OUTBOX_RECIPIENT_NAME_LENGTH, 'recipient name')),
        bookingDetails: z.object({
            date: isoDateSchema,
            startTime: timeSchema,
            endTime: timeSchema,
            cabinetTitle: z.string().min(1).max(MAX_OUTBOX_EMAIL_TITLE_LENGTH).transform((value) =>
                normalizeOutboxEmailText(value, MAX_OUTBOX_EMAIL_TITLE_LENGTH, 'cabinet title')),
            serviceTitle: z.string().min(1).max(MAX_OUTBOX_EMAIL_TITLE_LENGTH).transform((value) =>
                normalizeOutboxEmailText(value, MAX_OUTBOX_EMAIL_TITLE_LENGTH, 'service title')),
        }),
        status: z.enum(['created', 'confirmed', 'cancelled']),
        isForOwner: z.boolean(),
        frontendOrigin: z.string().transform((value) => normalizeFrontendOrigin(value, { allowHttpLoopback: true })),
        locale: z.enum(SUPPORTED_LOCALES).nullable(),
    }),
])

type EnqueueOutboxEventInput =
    | {
        type: 'booking.reminder'
        payload: z.infer<typeof bookingReminderPayloadSchema>
        idempotencyKey: string
        availableAt?: Date
    }
    | {
        type: 'notification.create'
        payload: z.infer<typeof notificationPayloadSchema>
        idempotencyKey: string
        availableAt?: Date
    }
    | {
        type: 'email.send'
        payload: z.infer<typeof emailPayloadSchema>
        idempotencyKey: string
        availableAt?: Date
    }

export async function enqueueOutboxEvent(
    input: EnqueueOutboxEventInput,
    manager: EntityManager = AppDataSource.manager,
) {
    assertSupportedOutboxEventType(input.type)
    assertOutboxPayloadWithinBounds(input.payload)
    const idempotencyKey = normalizeOutboxIdempotencyKey(input.idempotencyKey)
    const availableAt = assertOutboxAvailableAt(input.availableAt)
    const repository = manager.getRepository(OutboxEventEntity)

    await manager.query(
        `INSERT INTO "outbox_events"
            ("type", "payload", "idempotencyKey", "status", "attempts",
             "availableAt", "lockedAt", "processedAt", "lastError")
         VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT ("idempotencyKey") DO NOTHING`,
        [
            input.type,
            JSON.stringify(input.payload),
            idempotencyKey,
            OutboxEventStatus.Pending,
            0,
            availableAt,
            null,
            null,
            null,
        ],
    )

    return repository.findOneByOrFail({ idempotencyKey })
}

async function claimOutboxBatch() {
    return AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(OutboxEventEntity)
        const staleLockBefore = new Date(Date.now() - STALE_LOCK_MS)
        const events = await repository
            .createQueryBuilder('event')
            .where(`(
                event.status IN (:...statuses)
                OR (event.status = :processingStatus AND event.lockedAt < :staleLockBefore)
            )`, {
                statuses: [OutboxEventStatus.Pending, OutboxEventStatus.Failed],
                processingStatus: OutboxEventStatus.Processing,
                staleLockBefore,
            })
            .andWhere('event.availableAt <= :now', { now: new Date() })
            .andWhere('event.attempts < :maxAttempts', { maxAttempts: OUTBOX_MAX_ATTEMPTS })
            .orderBy('event.createdAt', 'ASC')
            .setLock('pessimistic_write')
            .setOnLocked('skip_locked')
            .take(BATCH_SIZE)
            .getMany()

        const lockedAt = new Date()
        for (const event of events) {
            if (event.status === OutboxEventStatus.Processing) {
                event.status = getStaleOutboxRecoveryStatus(event.attempts, OUTBOX_MAX_ATTEMPTS) === 'dead_letter'
                    ? OutboxEventStatus.DeadLetter
                    : OutboxEventStatus.Failed
            }
            event.status = OutboxEventStatus.Processing
            event.lockedAt = lockedAt
            event.attempts += 1
        }
        return repository.save(events)
    })
}

async function dispatchOutboxEvent(event: OutboxEventEntity, mailer?: Mailer) {
    if (event.type === 'booking.reminder') {
        const payload = bookingReminderPayloadSchema.parse(event.payload)
        const templateParams = {
            cabinetTitle: payload.cabinetTitle,
            date: payload.date,
            startTime: payload.startTime,
        }
        const content = renderNotificationTemplate('booking.reminder', templateParams)
        await createNotification({
            userId: payload.userId,
            category: NotificationCategory.Booking,
            title: content.title,
            message: content.message,
            link: content.link,
            metadata: {
                bookingId: payload.bookingId,
                reminder: true,
                templateKey: 'booking.reminder',
                templateParams,
            },
        })
        return
    }

    if (event.type === 'notification.create') {
        const payload = notificationPayloadSchema.parse(event.payload)
        await createNotification(payload)
        return
    }

    if (event.type === 'email.send') {
        if (!mailer) throw new Error('Mailer is required to dispatch email events.')

        const payload = emailPayloadSchema.parse(event.payload)
        if (payload.template === 'booking') {
            await mailer.send(createBookingEmail({
                ...payload,
                locale: payload.locale ?? undefined,
            }))
            return
        }

        const input = {
            email: payload.email,
            expiresAt: new Date(payload.expiresAt),
            frontendOrigin: payload.frontendOrigin,
            token: decryptOutboxSecret(payload.encryptedToken),
            locale: payload.locale ?? undefined,
        }

        if (payload.template === 'password_reset') {
            await mailer.send(createPasswordResetEmail(input))
        } else if (payload.template === 'email_verification') {
            await mailer.send(createEmailVerificationEmail(input))
        } else {
            await mailer.send(createPasswordSetupEmail(input))
        }
        return
    }

    throw new Error(`Unsupported outbox event type: ${event.type}`)
}

function getRetryAt(attempts: number) {
    return new Date(Date.now() + getOutboxRetryDelayMs(attempts))
}

export async function processOutboxBatch(
    mailer?: Mailer,
    assertLease?: () => void,
) {
    const events = await claimOutboxBatch()
    const repository = AppDataSource.getRepository(OutboxEventEntity)
    let completed = 0
    let failed = 0

    for (const event of events) {
        assertLease?.()
        try {
            await dispatchOutboxEvent(event, mailer)
            event.status = OutboxEventStatus.Completed
            event.payload = redactOutboxSecrets(event.payload)
            event.processedAt = new Date()
            event.lockedAt = null
            event.lastError = null
            await repository.save(event)
            completed += 1
        } catch (error) {
            const disposition = getOutboxFailureDisposition(event.attempts, OUTBOX_MAX_ATTEMPTS)
            event.status = disposition === 'dead_letter'
                ? OutboxEventStatus.DeadLetter
                : OutboxEventStatus.Failed
            if (disposition === 'dead_letter') {
                event.payload = redactOutboxSecrets(event.payload)
            }
            event.availableAt = getRetryAt(event.attempts)
            event.lockedAt = null
            event.lastError = normalizeOutboxError(error)
            await repository.save(event)
            failed += 1
        }
    }

    const abandoned = await repository.count({
        where: {
            status: In([OutboxEventStatus.Failed]),
            attempts: MoreThanOrEqual(OUTBOX_MAX_ATTEMPTS),
        },
    })
    const deadLetter = await repository.countBy({ status: OutboxEventStatus.DeadLetter })

    return { claimed: events.length, completed, failed, abandoned, deadLetter }
}
