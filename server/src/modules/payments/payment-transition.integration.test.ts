import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentInvoiceEntity, BookingPaymentInvoiceStatus } from '../../entities/booking/booking-payment-invoice.entity.js'
import { BookingPaymentRefundEntity } from '../../entities/booking/booking-payment-refund.entity.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { OutboxEventEntity } from '../../entities/outbox/outbox-event.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { applyPaymentTransition } from './payment-transition.service.js'

describe('payment transition refund concurrency', () => {
    let clientId: string
    let ownerId: string
    let cabinetId: string
    let serviceId: string
    let bookingId: string
    let paymentId: string

    beforeAll(async () => {
        const suffix = Date.now()
        const userRepository = AppDataSource.getRepository(UserEntity)
        const client = await userRepository.save(userRepository.create({
            name: `Refund Integration Client ${suffix}`,
            email: `refund-client-${suffix}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        clientId = client.id

        const owner = await userRepository.save(userRepository.create({
            name: `Refund Integration Owner ${suffix}`,
            email: `refund-owner-${suffix}@example.com`,
            role: UserRole.Owner,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        ownerId = owner.id

        const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
        const cabinet = await cabinetRepository.save(cabinetRepository.create({
            ownerId,
            title: `Refund Integration Cabinet ${suffix}`,
            description: 'Cabinet used by the refund transition integration test.',
            address: 'Refund street 1',
            city: 'Refund City',
            timezone: 'UTC',
            pricePerHour: 1000,
            status: CabinetStatus.Active,
            photos: [],
            amenities: [],
            cancellationPolicy: null,
            houseRules: null,
        }))
        cabinetId = cabinet.id

        const serviceRepository = AppDataSource.getRepository(ServiceEntity)
        const service = await serviceRepository.save(serviceRepository.create({
            cabinetId,
            title: 'Refund Integration Service',
            description: 'Service used by the refund transition integration test.',
            durationMinutes: 60,
            price: 1000,
            isActive: true,
        }))
        serviceId = service.id

        const bookingRepository = AppDataSource.getRepository(BookingEntity)
        const booking = await bookingRepository.save(bookingRepository.create({
            clientId,
            cabinetId,
            serviceId,
            date: '2099-05-15',
            startTime: '10:00',
            endTime: '11:00',
            status: BookingStatus.Confirmed,
            comment: 'Refund transition integration booking.',
            idempotencyKey: null,
            cancellationReason: null,
            ownerNote: null,
        }))
        bookingId = booking.id

        const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
        const payment = await paymentRepository.save(paymentRepository.create({
            bookingId,
            grossAmount: 1000,
            commissionAmount: 100,
            ownerPayoutAmount: 900,
            refundedAmountMinor: 0,
            currency: 'eur',
            status: BookingPaymentStatus.Paid,
            stripeSessionId: 'cs_refund_transition',
            stripePaymentIntentId: 'pi_refund_transition',
        }))
        paymentId = payment.id
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        await AppDataSource.getRepository(BookingPaymentRefundEntity).delete({ paymentId })
        await AppDataSource.getRepository(BookingPaymentInvoiceEntity).delete({ paymentId })
        await AppDataSource.getRepository(OutboxEventEntity).delete([
            { idempotencyKey: `notification:payment:${paymentId}:${BookingPaymentStatus.PartiallyRefunded}` },
            { idempotencyKey: `notification:payment:${paymentId}:${BookingPaymentStatus.Refunded}` },
        ])
        await AppDataSource.getRepository(BookingPaymentEntity).delete({ id: paymentId })
        await AppDataSource.getRepository(BookingEntity).delete({ id: bookingId })
        await AppDataSource.getRepository(ServiceEntity).delete({ id: serviceId })
        await AppDataSource.getRepository(CabinetEntity).delete({ id: cabinetId })
        await AppDataSource.getRepository(UserEntity).delete([clientId, ownerId])
    })

    it('serializes concurrent partial refunds and converges to a full refund', async () => {
        const partialRefund = (providerRefundId: string) => applyPaymentTransition({
            paymentId,
            bookingId,
            status: BookingPaymentStatus.PartiallyRefunded,
            source: 'stripe_reconciliation',
            refundEntries: [{
                providerRefundId,
                amountMinor: 60000,
                currency: 'eur',
            }],
            amount: 60000,
            currency: 'eur',
        })

        const concurrentResults = await Promise.allSettled([
            partialRefund('re_concurrent_1'),
            partialRefund('re_concurrent_2'),
        ])

        expect(concurrentResults.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
        expect(concurrentResults.filter((result) => result.status === 'rejected')).toHaveLength(1)
        await expect(AppDataSource.getRepository(BookingPaymentEntity).findOneBy({ id: paymentId }))
            .resolves.toMatchObject({ status: BookingPaymentStatus.PartiallyRefunded, refundedAmountMinor: 60000 })
        await expect(AppDataSource.getRepository(BookingPaymentInvoiceEntity).findOneBy({ paymentId }))
            .resolves.toMatchObject({
                amount: 1000,
                currency: 'eur',
                status: BookingPaymentInvoiceStatus.Paid,
            })
        expect(await AppDataSource.getRepository(BookingPaymentRefundEntity).countBy({ paymentId })).toBe(1)

        const finalResult = await applyPaymentTransition({
            paymentId,
            bookingId,
            status: BookingPaymentStatus.Refunded,
            source: 'stripe_reconciliation',
            refundEntries: [{
                providerRefundId: 're_final',
                amountMinor: 40000,
                currency: 'eur',
            }],
            amount: 100000,
            currency: 'eur',
        })

        expect(finalResult?.changed).toBe(true)
        await expect(AppDataSource.getRepository(BookingPaymentEntity).findOneBy({ id: paymentId }))
            .resolves.toMatchObject({ status: BookingPaymentStatus.Refunded, refundedAmountMinor: 100000 })
        await expect(AppDataSource.getRepository(BookingPaymentInvoiceEntity).findOneBy({ paymentId }))
            .resolves.toMatchObject({ status: BookingPaymentInvoiceStatus.Void })
        expect(await AppDataSource.getRepository(BookingPaymentRefundEntity).countBy({ paymentId })).toBe(2)
    })
})
