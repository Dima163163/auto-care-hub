import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import Stripe from 'stripe'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { buildApp } from '../app'
import { AppDataSource } from '../database/data-source'
import { BookingEntity, BookingStatus } from '../entities/booking/booking.entity'
import {
    BookingPaymentAttemptEntity,
    BookingPaymentAttemptStatus,
} from '../entities/booking/booking-payment-attempt.entity'
import { BookingPaymentEntity, BookingPaymentStatus } from '../entities/booking/booking-payment.entity'
import { BookingPaymentInvoiceEntity } from '../entities/booking/booking-payment-invoice.entity'
import { StripeWebhookEventEntity, StripeWebhookEventStatus } from '../entities/booking/stripe-webhook-event.entity'
import { CabinetEntity, CabinetStatus } from '../entities/cabinet/cabinet.entity'
import { CabinetScheduleEntity } from '../entities/cabinet/cabinet-schedule.entity'
import { OutboxEventEntity } from '../entities/outbox/outbox-event.entity'
import { ServiceEntity } from '../entities/service/service.entity'
import { UserEntity, UserRole, UserStatus } from '../entities/user/user.entity'
import { createAuthTokens } from '../modules/auth/auth.service'
import { stripe } from '../shared/stripe/stripe'

describe('Real-mode smoke flow', () => {
    let app: FastifyInstance
    let clientToken: string
    let ownerToken: string
    let superAdminToken: string
    let clientId: string
    let ownerId: string
    let superAdminId: string
    let stripeAccountId: string
    let cabinetId: string
    let serviceId: string
    let bookingId: string
    let paymentId: string
    let webhookEventId: string
    let failedWebhookEventId: string

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()

        const userRepository = AppDataSource.getRepository(UserEntity)
        const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
        const serviceRepository = AppDataSource.getRepository(ServiceEntity)
        const uniqueId = Date.now()
        stripeAccountId = `acct_smoke_owner_${uniqueId}`

        const client = await userRepository.save(userRepository.create({
            name: 'Smoke Client',
            email: `smoke-client-${uniqueId}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        clientId = client.id
        clientToken = createAuthTokens(client).accessToken

        const owner = await userRepository.save(userRepository.create({
            name: 'Smoke Owner',
            email: `smoke-owner-${uniqueId}@example.com`,
            role: UserRole.Owner,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
            stripeConnectAccountId: stripeAccountId,
        }))
        ownerId = owner.id
        ownerToken = createAuthTokens(owner).accessToken

        const superAdmin = await userRepository.save(userRepository.create({
            name: 'Smoke Super Admin',
            email: `smoke-super-admin-${uniqueId}@example.com`,
            role: UserRole.SuperAdmin,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        superAdminId = superAdmin.id
        superAdminToken = createAuthTokens(superAdmin).accessToken

        const cabinet = await cabinetRepository.save(cabinetRepository.create({
            ownerId,
            title: `Smoke Cabinet ${uniqueId}`,
            description: 'Cabinet used by the real-mode smoke flow.',
            address: 'Smoke street 1',
            city: 'Smoke City',
            pricePerHour: 1000,
            status: CabinetStatus.Active,
            photos: [],
        }))
        cabinetId = cabinet.id

        const service = await serviceRepository.save(serviceRepository.create({
            cabinetId,
            title: 'Smoke Consultation',
            description: 'Smoke service',
            durationMinutes: 60,
            price: 1500,
            isActive: true,
        }))
        serviceId = service.id
    })

    afterAll(async () => {
        if (AppDataSource.isInitialized) {
            if (bookingId) {
                await AppDataSource.getRepository(BookingPaymentInvoiceEntity).delete({ bookingId })
                await AppDataSource.getRepository(BookingPaymentAttemptEntity).delete({ bookingId })
                await AppDataSource.getRepository(BookingPaymentEntity).delete({ bookingId })
            }
            if (paymentId) {
                await AppDataSource.getRepository(BookingPaymentInvoiceEntity).delete({ paymentId })
            }
            if (paymentId) {
                await AppDataSource.getRepository(BookingPaymentEntity).delete({ id: paymentId })
                await AppDataSource.getRepository(OutboxEventEntity).delete([
                    { idempotencyKey: `notification:payment:${paymentId}:failed` },
                    { idempotencyKey: `notification:payment:${paymentId}:paid` },
                ])
            }
            if (webhookEventId) {
                await AppDataSource.getRepository(StripeWebhookEventEntity).delete({ id: webhookEventId })
            }
            if (failedWebhookEventId) {
                await AppDataSource.getRepository(StripeWebhookEventEntity).delete({ id: failedWebhookEventId })
            }
            await AppDataSource.getRepository(BookingEntity).delete({ id: bookingId })
            await AppDataSource.getRepository(ServiceEntity).delete({ id: serviceId })
            await AppDataSource.getRepository(CabinetEntity).delete({ id: cabinetId })
            const userIds = [clientId, ownerId, superAdminId]
                .filter((id): id is string => Boolean(id))
            for (const userId of userIds) {
                await AppDataSource.getRepository(UserEntity).delete({ id: userId })
            }
        }

        vi.restoreAllMocks()
        await app.close()
    })

    it('checks health, search, booking, owner status update, admin moderation, and audit logs', async () => {
        const healthResponse = await request(app.server).get('/health')

        expect([200, 503]).toContain(healthResponse.status)
        expect(healthResponse.body.status).toBe(healthResponse.status === 200 ? 'ok' : 'degraded')
        expect(healthResponse.body.database).toBe('connected')
        expect(healthResponse.body.checks.database.status).toBe('ok')
        expect(healthResponse.body.checks.storage.status).toBe('ok')

        const cabinetsResponse = await request(app.server)
            .get('/cabinets')
            .query({ search: 'Smoke Cabinet' })

        expect(cabinetsResponse.status).toBe(200)
        expect(cabinetsResponse.body.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: cabinetId,
                    title: expect.stringContaining('Smoke Cabinet'),
                }),
            ])
        )

        const bookingResponse = await request(app.server)
            .post('/bookings')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({
                cabinetId,
                serviceId,
                date: '2099-01-15',
                startTime: '10:00',
                endTime: '11:00',
            })

        expect(bookingResponse.status).toBe(200)
        expect(bookingResponse.body.status).toBe(BookingStatus.Pending)
        bookingId = bookingResponse.body.id

        const ownerBookingsResponse = await request(app.server)
            .get('/owner/bookings')
            .set('Authorization', `Bearer ${ownerToken}`)

        expect(ownerBookingsResponse.status).toBe(200)
        expect(ownerBookingsResponse.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: bookingId,
                    status: BookingStatus.Pending,
                }),
            ])
        )

        const retrieveConnectedAccount = vi
            .spyOn(stripe.accounts, 'retrieve')
            .mockResolvedValue({
                id: stripeAccountId,
                charges_enabled: true,
                payouts_enabled: true,
                details_submitted: true,
            } as Stripe.Account)
        const readinessResponse = await request(app.server)
            .get('/owner/readiness')
            .set('Authorization', `Bearer ${ownerToken}`)

        expect(readinessResponse.status).toBe(200)
        expect(readinessResponse.body).toMatchObject({
            ready: false,
            checks: {
                emailVerified: true,
                activeCabinet: true,
                activeService: true,
                scheduleConfigured: false,
                payoutAccount: 'ready',
            },
            blockers: ['schedule'],
        })
        const blockedCheckoutResponse = await request(app.server)
            .post(`/bookings/${bookingId}/payment/checkout`)
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send()

        expect(blockedCheckoutResponse.status).toBe(409)
        expect(blockedCheckoutResponse.body.code).toBe('CONFLICT')

        const scheduleRepository = AppDataSource.getRepository(CabinetScheduleEntity)
        await scheduleRepository.save(scheduleRepository.create({
            cabinetId,
            weekday: 1,
            openTime: '09:00',
            closeTime: '18:00',
            isOpen: true,
        }))

        const readyOwnerResponse = await request(app.server)
            .get('/owner/readiness')
            .set('Authorization', `Bearer ${ownerToken}`)

        expect(readyOwnerResponse.status).toBe(200)
        expect(readyOwnerResponse.body).toMatchObject({ ready: true, blockers: [] })
        const checkoutSession = {
            id: `cs_test_smoke_1_${Date.now()}`,
            url: `https://checkout.stripe.com/c/pay/cs_test_smoke_1_${Date.now()}`,
        } as Stripe.Checkout.Session
        const retryCheckoutSession = {
            id: `cs_test_smoke_2_${Date.now()}`,
            url: `https://checkout.stripe.com/c/pay/cs_test_smoke_2_${Date.now()}`,
        } as Stripe.Checkout.Session
        let checkoutCallCount = 0
        const failedStripeEventId = `evt_test_payment_failed_${Date.now()}`
        const completedStripeEventId = `evt_test_smoke_${Date.now()}`
        const createCheckoutSession = vi
            .spyOn(stripe.checkout.sessions, 'create')
            .mockImplementation(async () => {
                const session = checkoutCallCount === 0
                    ? checkoutSession
                    : retryCheckoutSession
                checkoutCallCount += 1
                return session
            })

        const checkoutResponse = await request(app.server)
            .post(`/bookings/${bookingId}/payment/checkout`)
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')

        expect(checkoutResponse.status).toBe(200)
        expect(checkoutResponse.body.url).toBe(checkoutSession.url)
        expect(retrieveConnectedAccount).toHaveBeenCalledWith(stripeAccountId)
        expect(createCheckoutSession).toHaveBeenCalledOnce()
        const firstStripeIdempotencyKey = (
            createCheckoutSession.mock.calls[0]?.[1] as { idempotencyKey?: string } | undefined
        )?.idempotencyKey
        expect(firstStripeIdempotencyKey).toBe(`checkout:${bookingId}:attempt:1`)

        const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
        const paymentAttemptRepository = AppDataSource.getRepository(BookingPaymentAttemptEntity)
        const pendingPayment = await paymentRepository.findOneByOrFail({ bookingId })
        paymentId = pendingPayment.id
        expect(pendingPayment.status).toBe(BookingPaymentStatus.Pending)
        expect(pendingPayment.currency).toBe('eur')
        expect(pendingPayment.commissionAmount).toBe(30)
        expect(pendingPayment.ownerPayoutAmount).toBe(1470)
        expect(pendingPayment.stripeSessionId).toBe(checkoutSession.id)
        const firstAttempt = await paymentAttemptRepository.findOneByOrFail({ paymentId: pendingPayment.id })
        expect(firstAttempt.status).toBe(BookingPaymentAttemptStatus.Created)
        expect(firstAttempt.stripeSessionId).toBe(checkoutSession.id)

        vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValueOnce({
            id: failedStripeEventId,
            object: 'event',
            api_version: '2026-06-24.dahlia',
            created: Math.floor(Date.now() / 1000),
            livemode: false,
            pending_webhooks: 1,
            request: null,
            type: 'checkout.session.async_payment_failed',
            data: {
                    object: {
                        id: checkoutSession.id,
                        object: 'checkout.session',
                        metadata: { bookingId, paymentId },
                        amount_total: 150_000,
                        currency: 'eur',
                    },
            },
        } as Stripe.Event).mockReturnValue({
            id: completedStripeEventId,
            object: 'event',
            api_version: '2026-06-24.dahlia',
            created: Math.floor(Date.now() / 1000),
            livemode: false,
            pending_webhooks: 1,
            request: null,
            type: 'checkout.session.completed',
            data: {
                    object: {
                        id: retryCheckoutSession.id,
                        object: 'checkout.session',
                        metadata: { bookingId, paymentId },
                        amount_total: 150_000,
                        currency: 'eur',
                        payment_intent: 'pi_test_smoke',
                },
            },
        } as Stripe.Event)

        const failedWebhookResponse = await request(app.server)
            .post('/webhooks/stripe')
            .set('Stripe-Signature', 't=smoke,v1=smoke')
            .send({ type: 'checkout.session.async_payment_failed' })

        expect(failedWebhookResponse.status).toBe(200)
        expect(failedWebhookResponse.body.received).toBe(true)

        const failedPayment = await paymentRepository.findOneByOrFail({ id: paymentId })
        const pendingBookingAfterFailure = await AppDataSource
            .getRepository(BookingEntity)
            .findOneByOrFail({ id: bookingId })
        expect(failedPayment.status).toBe(BookingPaymentStatus.Failed)
        expect(failedPayment.stripeSessionId).toBe(checkoutSession.id)
        const failedAttempt = await paymentAttemptRepository.findOneByOrFail({ id: firstAttempt.id })
        expect(failedAttempt.status).toBe(BookingPaymentAttemptStatus.Failed)
        expect(pendingBookingAfterFailure.status).toBe(BookingStatus.Pending)
        const failedPaymentNotification = await AppDataSource
            .getRepository(OutboxEventEntity)
            .findOneByOrFail({ idempotencyKey: `notification:payment:${paymentId}:failed` })
        expect(failedPaymentNotification.payload).toMatchObject({
            userId: clientId,
            metadata: {
                status: BookingPaymentStatus.Failed,
                source: 'stripe_webhook',
            },
        })

        const retryCheckoutResponse = await request(app.server)
            .post(`/bookings/${bookingId}/payment/checkout`)
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')

        expect(retryCheckoutResponse.status).toBe(200)
        expect(retryCheckoutResponse.body.url).toBe(retryCheckoutSession.url)
        expect(createCheckoutSession).toHaveBeenCalledTimes(2)
        const retryStripeIdempotencyKey = (
            createCheckoutSession.mock.calls[1]?.[1] as { idempotencyKey?: string } | undefined
        )?.idempotencyKey
        expect(retryStripeIdempotencyKey).toBe(`checkout:${bookingId}:attempt:2`)
        expect(retryStripeIdempotencyKey).not.toBe(firstStripeIdempotencyKey)
        const retryAttempt = await paymentAttemptRepository.findOneByOrFail({
            paymentId,
            attemptNumber: 2,
        })
        expect(retryAttempt.status).toBe(BookingPaymentAttemptStatus.Created)

        const webhookResponse = await request(app.server)
            .post('/webhooks/stripe')
            .set('Stripe-Signature', 't=smoke,v1=smoke')
            .send({ type: 'checkout.session.completed' })

        expect(webhookResponse.status).toBe(200)
        expect(webhookResponse.body.received).toBe(true)

        const webhookEvent = await AppDataSource
            .getRepository(StripeWebhookEventEntity)
            .findOneByOrFail({ stripeEventId: completedStripeEventId })
        webhookEventId = webhookEvent.id
        failedWebhookEventId = (await AppDataSource
            .getRepository(StripeWebhookEventEntity)
            .findOneByOrFail({ stripeEventId: failedStripeEventId })).id
        expect(webhookEvent.status).toBe(StripeWebhookEventStatus.Processed)

        const duplicateWebhookResponse = await request(app.server)
            .post('/webhooks/stripe')
            .set('Stripe-Signature', 't=smoke,v1=smoke')
            .send({ type: 'checkout.session.completed' })

        expect(duplicateWebhookResponse.status).toBe(200)
        expect(duplicateWebhookResponse.body.duplicate).toBe(true)

        const paidPayment = await paymentRepository.findOneByOrFail({ id: paymentId })
        const confirmedBooking = await AppDataSource.getRepository(BookingEntity).findOneByOrFail({ id: bookingId })
        expect(paidPayment.status).toBe(BookingPaymentStatus.Paid)
        expect(paidPayment.stripeSessionId).toBe(retryCheckoutSession.id)
        expect(paidPayment.stripePaymentIntentId).toBe('pi_test_smoke')
        const paidAttempt = await paymentAttemptRepository.findOneByOrFail({ id: retryAttempt.id })
        expect(paidAttempt.status).toBe(BookingPaymentAttemptStatus.Paid)
        expect(confirmedBooking.status).toBe(BookingStatus.Confirmed)
        const paidPaymentNotification = await AppDataSource
            .getRepository(OutboxEventEntity)
            .findOneByOrFail({ idempotencyKey: `notification:payment:${paymentId}:paid` })
        expect(paidPaymentNotification.payload).toMatchObject({
            userId: clientId,
            metadata: {
                status: BookingPaymentStatus.Paid,
                source: 'stripe_webhook',
            },
        })

        const confirmBookingResponse = await request(app.server)
            .patch(`/bookings/${bookingId}/status`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ status: BookingStatus.Confirmed })

        expect(confirmBookingResponse.status).toBe(200)
        expect(confirmBookingResponse.body.status).toBe(BookingStatus.Confirmed)

        const blockUserResponse = await request(app.server)
            .patch(`/admin/users/${clientId}/status`)
            .set('Authorization', `Bearer ${superAdminToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ status: UserStatus.Blocked })

        expect(blockUserResponse.status).toBe(200)
        expect(blockUserResponse.body.status).toBe(UserStatus.Blocked)

        const auditLogsResponse = await request(app.server)
            .get('/admin/audit-logs')
            .set('Authorization', `Bearer ${superAdminToken}`)

        expect(auditLogsResponse.status).toBe(200)
        expect(auditLogsResponse.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    action: 'user_status_updated',
                    correlationId: expect.any(String),
                    targetId: clientId,
                    targetType: 'user',
                }),
            ])
        )
    })
})
