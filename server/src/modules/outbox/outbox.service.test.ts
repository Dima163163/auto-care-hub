import { afterAll, describe, expect, it, vi } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { OutboxEventEntity, OutboxEventStatus } from '../../entities/outbox/outbox-event.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { enqueueOutboxEvent, processOutboxBatch } from './outbox.service.js'
import { encryptOutboxSecret } from './outbox-secret.js'

async function processOutboxUntilCompleted(
    idempotencyKey: string,
    mailer?: Parameters<typeof processOutboxBatch>[0],
) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const event = await AppDataSource.getRepository(OutboxEventEntity).findOneBy({ idempotencyKey })
        if (event?.status === OutboxEventStatus.Completed) return event

        await processOutboxBatch(mailer)
    }

    return AppDataSource.getRepository(OutboxEventEntity).findOneByOrFail({ idempotencyKey })
}

describe('outbox processing', () => {
    const suffix = `${Date.now()}`
    const idempotencyKey = `test-booking-reminder:${suffix}`
    let userId: string | null = null

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return
        await AppDataSource.getRepository(OutboxEventEntity).delete({ idempotencyKey })
        if (userId) {
            await AppDataSource.getRepository(NotificationEntity).delete({ userId })
            await AppDataSource.getRepository(UserEntity).delete({ id: userId })
        }
    })

    it('deduplicates and delivers a booking reminder once', async () => {
        const userRepository = AppDataSource.getRepository(UserEntity)
        const user = await userRepository.save(userRepository.create({
            name: 'Outbox Client',
            email: `outbox-${suffix}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
        }))
        userId = user.id
        const input = {
            type: 'booking.reminder' as const,
            idempotencyKey,
            payload: {
                bookingId: '123e4567-e89b-42d3-a456-426614174000',
                cabinetTitle: 'Reminder Cabinet',
                date: '2026-07-20',
                startTime: '10:00',
                userId: user.id,
            },
        }

        const [first, duplicate] = await Promise.all([
            enqueueOutboxEvent(input),
            enqueueOutboxEvent(input),
        ])
        expect(first.id === duplicate.id || first.idempotencyKey === duplicate.idempotencyKey).toBe(true)
        expect(await AppDataSource.getRepository(OutboxEventEntity).countBy({ idempotencyKey }))
            .toBe(1)

        const event = await processOutboxUntilCompleted(idempotencyKey)
        const notifications = await AppDataSource.getRepository(NotificationEntity).findBy({ userId: user.id })

        expect(event.status).toBe(OutboxEventStatus.Completed)
        expect(notifications.filter((notification) =>
            notification.metadata.bookingId === input.payload.bookingId
        )).toHaveLength(1)
    })

    it('claims one pending event across concurrent workers', async () => {
        if (!userId) throw new Error('Expected the outbox integration user to be initialized.')

        const concurrentKey = `test-booking-reminder-concurrent:${suffix}`
        const bookingId = '323e4567-e89b-42d3-a456-426614174000'
        await enqueueOutboxEvent({
            type: 'booking.reminder',
            idempotencyKey: concurrentKey,
            payload: {
                bookingId,
                cabinetTitle: 'Concurrent Reminder Cabinet',
                date: '2026-07-21',
                startTime: '11:00',
                userId,
            },
        })

        await Promise.all([
            processOutboxBatch(),
            processOutboxBatch(),
        ])

        const event = await processOutboxUntilCompleted(concurrentKey)
        expect(event.status).toBe(OutboxEventStatus.Completed)

        const notifications = await AppDataSource.getRepository(NotificationEntity).findBy({ userId })
        expect(notifications.filter((notification) => notification.metadata.bookingId === bookingId))
            .toHaveLength(1)

        await AppDataSource.getRepository(OutboxEventEntity).delete({ idempotencyKey: concurrentKey })
    })

    it('dispatches booking email events through the mailer', async () => {
        const bookingEmailIdempotencyKey = `test-booking-email:${suffix}`
        const mailer = {
            send: vi.fn().mockResolvedValue(undefined),
            verify: vi.fn().mockResolvedValue(undefined),
        }

        await enqueueOutboxEvent({
            type: 'email.send',
            idempotencyKey: bookingEmailIdempotencyKey,
            payload: {
                template: 'booking',
                bookingId: '223e4567-e89b-42d3-a456-426614174000',
                toEmail: `booking-email-${suffix}@example.com`,
                recipientName: 'Booking Client',
                bookingDetails: {
                    date: '2026-07-22',
                    startTime: '10:00',
                    endTime: '11:00',
                    cabinetTitle: 'Email Cabinet',
                    serviceTitle: 'Email Service',
                },
                status: 'confirmed',
                isForOwner: false,
                frontendOrigin: 'https://autocarehub.example.com',
                locale: null,
            },
        })

        const event = await processOutboxUntilCompleted(bookingEmailIdempotencyKey, mailer)

        expect(event.status).toBe(OutboxEventStatus.Completed)
        expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({
            to: `booking-email-${suffix}@example.com`,
            subject: expect.any(String),
        }))

        await AppDataSource.getRepository(OutboxEventEntity).delete({
            idempotencyKey: bookingEmailIdempotencyKey,
        })
    })

    it('dispatches a localized AutoCare visit reminder email through the outbox', async () => {
        const reminderKey = `test-autocare-visit-reminder:${suffix}`
        const mailer = {
            send: vi.fn().mockResolvedValue(undefined),
            verify: vi.fn().mockResolvedValue(undefined),
        }

        await enqueueOutboxEvent({
            type: 'email.send',
            idempotencyKey: reminderKey,
            payload: {
                template: 'autocare_visit_reminder',
                requestId: '423e4567-e89b-42d3-a456-426614174000',
                toEmail: `autocare-reminder-${suffix}@example.com`,
                recipientName: 'Иван',
                providerName: 'ProService',
                serviceTitle: 'Замена масла',
                date: '24 августа 2026 г.',
                startTime: '10:30',
                frontendOrigin: 'https://autocarehub.example.com',
                locale: 'ru',
            },
        })

        const event = await processOutboxUntilCompleted(reminderKey, mailer)

        expect(event.status).toBe(OutboxEventStatus.Completed)
        expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({
            to: `autocare-reminder-${suffix}@example.com`,
            subject: 'Напоминание о визите в автосервис',
            text: expect.stringContaining('Замена масла'),
        }))

        await AppDataSource.getRepository(OutboxEventEntity).delete({ idempotencyKey: reminderKey })
    })

    it('erases auth secrets from persisted payloads after successful dispatch', async () => {
        const authEmailIdempotencyKey = `test-password-setup:${suffix}`
        const token = 'auth-token-value-that-is-long-enough-for-the-security-flow'
        const mailer = {
            send: vi.fn().mockResolvedValue(undefined),
            verify: vi.fn().mockResolvedValue(undefined),
        }

        await enqueueOutboxEvent({
            type: 'email.send',
            idempotencyKey: authEmailIdempotencyKey,
            payload: {
                template: 'password_setup',
                email: `password-setup-${suffix}@example.com`,
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
                frontendOrigin: 'https://autocarehub.example.com',
                encryptedToken: encryptOutboxSecret(token),
                locale: null,
            },
        })

        await processOutboxBatch(mailer)

        const event = await AppDataSource.getRepository(OutboxEventEntity).findOneByOrFail({
            idempotencyKey: authEmailIdempotencyKey,
        })

        expect(event.status).toBe(OutboxEventStatus.Completed)
        expect(event.payload).not.toHaveProperty('token')
        expect(event.payload).not.toHaveProperty('encryptedToken')
        expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining(`token=${token}`),
        }))

        await AppDataSource.getRepository(OutboxEventEntity).delete({
            idempotencyKey: authEmailIdempotencyKey,
        })
    })
})
