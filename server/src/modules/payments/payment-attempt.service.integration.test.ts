import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import {
    BookingPaymentAttemptEntity,
} from '../../entities/booking/booking-payment-attempt.entity.js'
import { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { reserveCheckoutAttempt } from './payment-attempt.service.js'

describe('checkout attempt reservation integration', () => {
    let clientId: string
    let ownerId: string
    let cabinetId: string
    let serviceId: string
    let bookingId: string

    beforeAll(async () => {
        const suffix = Date.now()
        const userRepository = AppDataSource.getRepository(UserEntity)
        const client = await userRepository.save(userRepository.create({
            name: `Checkout Integration Client ${suffix}`,
            email: `checkout-client-${suffix}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        clientId = client.id

        const owner = await userRepository.save(userRepository.create({
            name: `Checkout Integration Owner ${suffix}`,
            email: `checkout-owner-${suffix}@example.com`,
            role: UserRole.Owner,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        ownerId = owner.id

        const cabinet = await AppDataSource.getRepository(CabinetEntity).save(
            AppDataSource.getRepository(CabinetEntity).create({
                ownerId,
                title: `Checkout Integration Cabinet ${suffix}`,
                description: 'Cabinet used by the checkout reservation integration test.',
                address: 'Integration street 1',
                city: 'Integration City',
                timezone: 'UTC',
                pricePerHour: 2500,
                status: CabinetStatus.Active,
                photos: [],
                amenities: [],
                cancellationPolicy: null,
                houseRules: null,
            }),
        )
        cabinetId = cabinet.id

        const service = await AppDataSource.getRepository(ServiceEntity).save(
            AppDataSource.getRepository(ServiceEntity).create({
                cabinetId,
                title: 'Checkout Integration Service',
                description: 'Service used by the checkout reservation integration test.',
                durationMinutes: 60,
                price: 2500,
                isActive: true,
            }),
        )
        serviceId = service.id

        const booking = await AppDataSource.getRepository(BookingEntity).save(
            AppDataSource.getRepository(BookingEntity).create({
                clientId,
                cabinetId,
                serviceId,
                date: '2099-04-15',
                startTime: '10:00',
                endTime: '11:00',
                status: BookingStatus.Pending,
                comment: 'Checkout integration booking.',
                idempotencyKey: null,
                cancellationReason: null,
                ownerNote: null,
            }),
        )
        bookingId = booking.id
    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        await AppDataSource.getRepository(BookingPaymentAttemptEntity).delete({ bookingId })
        await AppDataSource.getRepository(BookingPaymentEntity).delete({ bookingId })
        await AppDataSource.getRepository(BookingEntity).delete({ id: bookingId })
        await AppDataSource.getRepository(ServiceEntity).delete({ id: serviceId })
        await AppDataSource.getRepository(CabinetEntity).delete({ id: cabinetId })
        await AppDataSource.getRepository(UserEntity).delete([clientId, ownerId])
    })

    it('keeps one payment attempt for concurrent retries with one client key', async () => {
        const input = {
            bookingId,
            clientIdempotencyKey: 'checkout-integration-key',
            grossAmount: 2500,
            commissionAmount: 250,
            ownerPayoutAmount: 2250,
            currency: 'eur',
        }

        const [first, second] = await Promise.all([
            reserveCheckoutAttempt(input),
            reserveCheckoutAttempt(input),
        ])

        expect(first.status).toBe('create')
        expect(second.status).toBe('create')
        if (first.status !== 'create' || second.status !== 'create') return

        expect(first.attemptId).toBe(second.attemptId)
        expect(first.stripeIdempotencyKey).toBe(second.stripeIdempotencyKey)
        expect([first.reused, second.reused].sort()).toEqual([false, true])
        expect(await AppDataSource.getRepository(BookingPaymentAttemptEntity).countBy({ bookingId })).toBe(1)
    })
})
