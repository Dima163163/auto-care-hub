import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentInvoiceEntity } from '../../entities/booking/booking-payment-invoice.entity.js'
import {
    StripeWebhookEventEntity,
    StripeWebhookEventStatus,
} from '../../entities/booking/stripe-webhook-event.entity.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { OutboxEventEntity } from '../../entities/outbox/outbox-event.entity.js'
import { stripe } from '../../shared/stripe/stripe.js'
import { reconcileUnmatchedStripeWebhooks } from './stripe-webhook-reconciliation.service.js'

function unsupportedEvent(stripeEventId: string): Stripe.Event {
    return {
        id: stripeEventId,
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2026-06-24.dahlia',
        object: 'event',
        data: { object: {} },
    } as Stripe.Event
}

function completedCheckoutEvent(input: {
    stripeEventId: string
    bookingId: string
    paymentId: string
}): Stripe.Event {
    return {
        id: input.stripeEventId,
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2026-06-24.dahlia',
        object: 'event',
        data: {
            object: {
                id: `cs_replay_${input.stripeEventId}`,
                metadata: {
                    bookingId: input.bookingId,
                    paymentId: input.paymentId,
                },
                amount_total: 100000,
                currency: 'eur',
                payment_intent: 'pi_replay_after_payment',
            },
        },
    } as unknown as Stripe.Event
}

describe('Stripe webhook reconciliation lease recovery', () => {
    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const staleEventId = `evt_stale_replay_${suffix}`
    const activeEventId = `evt_active_replay_${suffix}`
    const concurrentEventId = `evt_concurrent_replay_${suffix}`
    const paymentAfterWebhookEventId = `evt_payment_after_webhook_${suffix}`
    const providerRetryEventId = `evt_provider_retry_${suffix}`
    let delayedClientId: string | undefined
    let delayedOwnerId: string | undefined
    let delayedCabinetId: string | undefined
    let delayedServiceId: string | undefined
    let delayedBookingId: string | undefined
    let delayedPaymentId: string | undefined

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        await AppDataSource.getRepository(StripeWebhookEventEntity).delete([
            { stripeEventId: staleEventId },
            { stripeEventId: activeEventId },
            { stripeEventId: concurrentEventId },
            { stripeEventId: paymentAfterWebhookEventId },
            { stripeEventId: providerRetryEventId },
        ])

        if (delayedPaymentId) {
            await AppDataSource.getRepository(BookingPaymentInvoiceEntity).delete({ paymentId: delayedPaymentId })
            await AppDataSource.getRepository(OutboxEventEntity).delete({
                idempotencyKey: `notification:payment:${delayedPaymentId}:${BookingPaymentStatus.Paid}`,
            })
            await AppDataSource.getRepository(BookingPaymentEntity).delete({ id: delayedPaymentId })
        }
        if (delayedBookingId) {
            await AppDataSource.getRepository(BookingEntity).delete({ id: delayedBookingId })
        }
        if (delayedServiceId) {
            await AppDataSource.getRepository(ServiceEntity).delete({ id: delayedServiceId })
        }
        if (delayedCabinetId) {
            await AppDataSource.getRepository(CabinetEntity).delete({ id: delayedCabinetId })
        }
        await AppDataSource.getRepository(UserEntity).delete(
            [delayedClientId, delayedOwnerId].filter((id): id is string => Boolean(id)),
        )
    })

    it('replays expired processing leases without claiming a live lease', async () => {
        const repository = AppDataSource.getRepository(StripeWebhookEventEntity)
        await repository.insert([
            {
                stripeEventId: staleEventId,
                eventType: 'payment_intent.succeeded',
                status: StripeWebhookEventStatus.Processing,
                processedAt: null,
                lastError: null,
                leaseToken: 'stale-token',
                leaseExpiresAt: new Date(Date.now() - 1_000),
            },
            {
                stripeEventId: activeEventId,
                eventType: 'payment_intent.succeeded',
                status: StripeWebhookEventStatus.Processing,
                processedAt: null,
                lastError: null,
                leaseToken: 'active-token',
                leaseExpiresAt: new Date(Date.now() + 60_000),
            },
        ])

        const retrieve = vi.spyOn(stripe.events, 'retrieve')
            .mockImplementation(async (stripeEventId) => unsupportedEvent(String(stripeEventId)))

        const result = await reconcileUnmatchedStripeWebhooks()

        expect(result.unsupported).toBeGreaterThanOrEqual(1)
        expect(retrieve).toHaveBeenCalledWith(staleEventId)
        expect(retrieve).not.toHaveBeenCalledWith(activeEventId)
        await expect(repository.findOneBy({ stripeEventId: staleEventId })).resolves.toMatchObject({
            status: StripeWebhookEventStatus.Processed,
        })
        await expect(repository.findOneBy({ stripeEventId: activeEventId })).resolves.toMatchObject({
            status: StripeWebhookEventStatus.Processing,
            leaseToken: 'active-token',
        })

        retrieve.mockRestore()
    })

    it('allows only one concurrent reconciliation worker to finalize an unmatched event', async () => {
        const repository = AppDataSource.getRepository(StripeWebhookEventEntity)
        await repository.insert({
            stripeEventId: concurrentEventId,
            eventType: 'payment_intent.succeeded',
            status: StripeWebhookEventStatus.Unmatched,
            processedAt: null,
            lastError: 'Payment was not available when the webhook arrived.',
            leaseToken: null,
            leaseExpiresAt: null,
        })

        const retrieve = vi.spyOn(stripe.events, 'retrieve')
            .mockImplementation(async (stripeEventId) => unsupportedEvent(String(stripeEventId)))

        try {
            const [first, second] = await Promise.all([
                reconcileUnmatchedStripeWebhooks(),
                reconcileUnmatchedStripeWebhooks(),
            ])

            expect(first.unsupported + second.unsupported).toBe(1)
            expect(first.skipped + second.skipped).toBeLessThanOrEqual(1)
            expect(retrieve).toHaveBeenCalledTimes(1)
            await expect(repository.findOneBy({ stripeEventId: concurrentEventId })).resolves.toMatchObject({
                status: StripeWebhookEventStatus.Processed,
                leaseToken: null,
                leaseExpiresAt: null,
            })
        } finally {
            retrieve.mockRestore()
        }
    })

    it('replays a checkout webhook after the payment record becomes available', async () => {
        const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`
        const userRepository = AppDataSource.getRepository(UserEntity)
        const client = await userRepository.save(userRepository.create({
            name: `Webhook Replay Client ${suffix}`,
            email: `webhook-replay-client-${suffix}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        delayedClientId = client.id

        const owner = await userRepository.save(userRepository.create({
            name: `Webhook Replay Owner ${suffix}`,
            email: `webhook-replay-owner-${suffix}@example.com`,
            role: UserRole.Owner,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        delayedOwnerId = owner.id

        const cabinet = await AppDataSource.getRepository(CabinetEntity).save(
            AppDataSource.getRepository(CabinetEntity).create({
                ownerId: owner.id,
                title: `Webhook Replay Cabinet ${suffix}`,
                description: 'Cabinet used by webhook replay integration coverage.',
                address: 'Webhook Replay street 1',
                city: 'Replay City',
                timezone: 'UTC',
                pricePerHour: 1000,
                status: CabinetStatus.Active,
                photos: [],
                amenities: [],
                cancellationPolicy: null,
                houseRules: null,
            }),
        )
        delayedCabinetId = cabinet.id

        const service = await AppDataSource.getRepository(ServiceEntity).save(
            AppDataSource.getRepository(ServiceEntity).create({
                cabinetId: cabinet.id,
                title: 'Webhook Replay Service',
                description: 'Service used by webhook replay integration coverage.',
                durationMinutes: 60,
                price: 1000,
                isActive: true,
            }),
        )
        delayedServiceId = service.id

        const booking = await AppDataSource.getRepository(BookingEntity).save(
            AppDataSource.getRepository(BookingEntity).create({
                clientId: client.id,
                cabinetId: cabinet.id,
                serviceId: service.id,
                date: '2099-06-15',
                startTime: '10:00',
                endTime: '11:00',
                status: BookingStatus.Pending,
                comment: 'Webhook arrived before the payment row.',
                idempotencyKey: null,
                cancellationReason: null,
                ownerNote: null,
            }),
        )
        delayedBookingId = booking.id
        const paymentId = randomUUID()
        delayedPaymentId = paymentId

        await AppDataSource.getRepository(StripeWebhookEventEntity).insert({
            stripeEventId: paymentAfterWebhookEventId,
            eventType: 'checkout.session.completed',
            status: StripeWebhookEventStatus.Unmatched,
            processedAt: null,
            lastError: 'Payment was not available when the webhook arrived.',
            leaseToken: null,
            leaseExpiresAt: null,
        })

        const event = completedCheckoutEvent({
            stripeEventId: paymentAfterWebhookEventId,
            bookingId: booking.id,
            paymentId,
        })
        const retrieve = vi.spyOn(stripe.events, 'retrieve').mockResolvedValue(event)

        try {
            const firstReplay = await reconcileUnmatchedStripeWebhooks()
            expect(firstReplay.retryable).toBe(1)
            await expect(AppDataSource.getRepository(StripeWebhookEventEntity).findOneBy({
                stripeEventId: paymentAfterWebhookEventId,
            })).resolves.toMatchObject({ status: StripeWebhookEventStatus.Unmatched })

            await AppDataSource.getRepository(BookingPaymentEntity).save(
                AppDataSource.getRepository(BookingPaymentEntity).create({
                    id: paymentId,
                    bookingId: booking.id,
                    grossAmount: 1000,
                    commissionAmount: 100,
                    ownerPayoutAmount: 900,
                    refundedAmountMinor: 0,
                    currency: 'eur',
                    status: BookingPaymentStatus.Pending,
                    stripeSessionId: null,
                    stripePaymentIntentId: null,
                }),
            )

            const secondReplay = await reconcileUnmatchedStripeWebhooks()
            expect(secondReplay.applied).toBe(1)
            await expect(AppDataSource.getRepository(StripeWebhookEventEntity).findOneBy({
                stripeEventId: paymentAfterWebhookEventId,
            })).resolves.toMatchObject({ status: StripeWebhookEventStatus.Processed })
            await expect(AppDataSource.getRepository(BookingPaymentEntity).findOneBy({ id: delayedPaymentId }))
                .resolves.toMatchObject({
                    status: BookingPaymentStatus.Paid,
                    stripePaymentIntentId: 'pi_replay_after_payment',
                })
        } finally {
            retrieve.mockRestore()
        }
    })

    it('keeps a transient provider replay retryable before a later success', async () => {
        const repository = AppDataSource.getRepository(StripeWebhookEventEntity)
        await repository.insert({
            stripeEventId: providerRetryEventId,
            eventType: 'payment_intent.succeeded',
            status: StripeWebhookEventStatus.Unmatched,
            processedAt: null,
            lastError: 'Provider replay is pending.',
            leaseToken: null,
            leaseExpiresAt: null,
        })

        let attempts = 0
        const retrieve = vi.spyOn(stripe.events, 'retrieve').mockImplementation(async () => {
            attempts += 1
            if (attempts === 1) {
                throw new Stripe.errors.StripeConnectionError({ message: 'provider unavailable' })
            }
            return unsupportedEvent(providerRetryEventId)
        })

        try {
            const retry = await reconcileUnmatchedStripeWebhooks()
            expect(retry.retryable).toBe(1)
            await expect(repository.findOneBy({ stripeEventId: providerRetryEventId })).resolves.toMatchObject({
                status: StripeWebhookEventStatus.Unmatched,
            })

            const success = await reconcileUnmatchedStripeWebhooks()
            expect(success.unsupported).toBe(1)
            await expect(repository.findOneBy({ stripeEventId: providerRetryEventId })).resolves.toMatchObject({
                status: StripeWebhookEventStatus.Processed,
            })
        } finally {
            retrieve.mockRestore()
        }
    })
})
