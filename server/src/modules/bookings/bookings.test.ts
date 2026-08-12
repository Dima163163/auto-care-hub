import type { FastifyInstance } from 'fastify'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { In } from 'typeorm'
import { buildApp } from '../../app'
import { AppDataSource } from '../../database/data-source'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity'
import { ServiceEntity } from '../../entities/service/service.entity'
import { CabinetScheduleEntity } from '../../entities/cabinet/cabinet-schedule.entity'
import { CabinetScheduleExceptionEntity } from '../../entities/cabinet/cabinet-schedule-exception.entity'
import { BookingPaymentEntity, BookingPaymentStatus } from '../../entities/booking/booking-payment.entity'
import { BookingPaymentAttemptEntity } from '../../entities/booking/booking-payment-attempt.entity'
import { BookingPaymentInvoiceEntity } from '../../entities/booking/booking-payment-invoice.entity'
import { BookingPaymentRefundEntity } from '../../entities/booking/booking-payment-refund.entity'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity'
import { BookingRescheduleRequestEntity } from '../../entities/booking/booking-reschedule-request.entity'
import { BookingStatusHistoryEntity } from '../../entities/booking/booking-status-history.entity'
import { OutboxEventEntity } from '../../entities/outbox/outbox-event.entity'
import { CabinetBlockedPeriodEntity } from '../../entities/cabinet/cabinet-blocked-period.entity'
import { createAuthTokens } from '../auth/auth.service'
import { addDays, getWeekday } from '../../shared/date-time/cabinet-timezone'

describe('Booking Overlap Integration', () => {
    let clientToken: string
    let availabilityClientToken: string
    let ownerToken: string
    let clientId: string
    let availabilityClientId: string
    let ownerId: string
    let cabinetId: string
    let serviceId: string
    let app: FastifyInstance

    function futureDate(daysFromNow: number) {
        return addDays(new Date().toISOString().slice(0, 10), daysFromNow)
    }

    function createBooking(date: string, startTime = '10:00', endTime = '11:00') {
        return request(app.server)
            .post('/bookings')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ cabinetId, serviceId, date, startTime, endTime })
    }

    beforeAll(async () => {
        app = await buildApp()
        await app.ready()

        const userRepository = AppDataSource.getRepository(UserEntity)
        const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
        const serviceRepository = AppDataSource.getRepository(ServiceEntity)

        // 1. Create a client
        const client = userRepository.create({
            name: 'Booking Client',
            email: `client-${Date.now()}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(), // Important for requireVerifiedEmail middleware
        })
        const savedClient = await userRepository.save(client)
        clientId = savedClient.id
        const tokens = createAuthTokens(savedClient)
        clientToken = tokens.accessToken

        const availabilityClient = await userRepository.save(userRepository.create({
            name: 'Availability Client',
            email: `availability-client-${Date.now()}@example.com`,
            role: UserRole.Client,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        }))
        availabilityClientId = availabilityClient.id
        availabilityClientToken = createAuthTokens(availabilityClient).accessToken

        // 2. Create an owner and a cabinet
        const owner = userRepository.create({
            name: 'Cabinet Owner',
            email: `owner-${Date.now()}@example.com`,
            role: UserRole.Owner,
            status: UserStatus.Active,
            passwordHash: 'hash',
            emailVerifiedAt: new Date(),
        })
        const savedOwner = await userRepository.save(owner)
        ownerId = savedOwner.id
        ownerToken = createAuthTokens(savedOwner).accessToken

        const cabinet = cabinetRepository.create({
            ownerId: savedOwner.id,
            title: 'Test Cabinet',
            description: 'Test description',
            address: 'Test st',
            city: 'Test City',
            pricePerHour: 1000,
            status: CabinetStatus.Active,
        })
        const savedCabinet = await cabinetRepository.save(cabinet)
        cabinetId = savedCabinet.id

        // 3. Create a service
        const service = serviceRepository.create({
            cabinetId: savedCabinet.id,
            title: 'Test Service',
            durationMinutes: 60,
            price: 1000,
            isActive: true,
        })
        const savedService = await serviceRepository.save(service)
        serviceId = savedService.id

    })

    afterAll(async () => {
        if (!AppDataSource.isInitialized) return

        const bookingRepository = AppDataSource.getRepository(BookingEntity)
        const bookings = await bookingRepository.find({
            where: [{ clientId }, { cabinetId }],
            select: { id: true },
        })
        const bookingIds = bookings.map((booking) => booking.id)

        if (bookingIds.length > 0) {
            await AppDataSource.getRepository(BookingPaymentRefundEntity).delete({ bookingId: In(bookingIds) })
            await AppDataSource.getRepository(BookingPaymentInvoiceEntity).delete({ bookingId: In(bookingIds) })
            await AppDataSource.getRepository(BookingPaymentAttemptEntity).delete({ bookingId: In(bookingIds) })
            await AppDataSource.getRepository(BookingPaymentEntity).delete({ bookingId: In(bookingIds) })
            await AppDataSource.getRepository(BookingRescheduleRequestEntity).delete({ bookingId: In(bookingIds) })
            await AppDataSource.getRepository(BookingStatusHistoryEntity).delete({ bookingId: In(bookingIds) })
            await AppDataSource.getRepository(OutboxEventEntity).delete(
                bookingIds.flatMap((bookingId) => [
                    { idempotencyKey: `notification:booking:${bookingId}:created:booking:${clientId}` },
                    { idempotencyKey: `notification:booking:${bookingId}:created:booking:${ownerId}` },
                ]),
            )
            await bookingRepository.delete({ id: In(bookingIds) })
        }

        await AppDataSource.getRepository(CabinetScheduleEntity).delete({ cabinetId })
        await AppDataSource.getRepository(CabinetScheduleExceptionEntity).delete({ cabinetId })
        await AppDataSource.getRepository(CabinetBlockedPeriodEntity).delete({ cabinetId })
        await AppDataSource.getRepository(ServiceEntity).delete({ id: serviceId })
        await AppDataSource.getRepository(CabinetEntity).delete({ id: cabinetId })
        await AppDataSource.getRepository(UserEntity).delete([clientId, availabilityClientId, ownerId])
        await app.close()
    })

    it('prevents overlapping bookings for the same cabinet', async () => {
        const date = futureDate(5)
        
        // 1. Create first booking (10:00 - 11:00)
        const res1 = await request(app.server)
            .post('/bookings')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({
                cabinetId,
                serviceId,
                date,
                startTime: '10:00',
                endTime: '11:00',
            })
        
        expect(res1.status).toBe(200)

        const createdBookingId = res1.body.id as string
        const history = await AppDataSource.getRepository(BookingStatusHistoryEntity).findBy({
            bookingId: createdBookingId,
        })
        expect(history).toHaveLength(1)
        expect(history[0]?.status).toBe(BookingStatus.Pending)

        const outboxRepository = AppDataSource.getRepository(OutboxEventEntity)
        expect(await outboxRepository.countBy({
            idempotencyKey: `notification:booking:${createdBookingId}:created:booking:${clientId}`,
        })).toBe(1)
        expect(await outboxRepository.countBy({
            idempotencyKey: `notification:booking:${createdBookingId}:created:booking:${ownerId}`,
        })).toBe(1)

        // 2. Try to create overlapping booking (10:30 - 11:30)
        const res2 = await request(app.server)
            .post('/bookings')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({
                cabinetId,
                serviceId,
                date,
                startTime: '10:30',
                endTime: '11:30',
            })
        
        expect(res2.status).toBe(409)
        expect(res2.body.code).toBe('CONFLICT')
        
        // 3. Try to create non-overlapping booking (11:00 - 12:00)
        const res3 = await request(app.server)
            .post('/bookings')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({
                cabinetId,
                serviceId,
                date,
                startTime: '11:00',
                endTime: '12:00',
            })
        
        expect(res3.status).toBe(200)
    })

    it('rejects bookings on a weekday closed by the cabinet schedule', async () => {
        const date = futureDate(8)
        const scheduleRepository = AppDataSource.getRepository(CabinetScheduleEntity)
        await scheduleRepository.upsert({
            cabinetId,
            weekday: getWeekday(date),
            openTime: '08:00',
            closeTime: '22:00',
            isOpen: false,
        }, ['cabinetId', 'weekday'])

        const response = await createBooking(date)

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('VALIDATION_ERROR')
    })

    it('rejects bookings on a one-off closed date', async () => {
        const date = futureDate(9)
        const exceptionRepository = AppDataSource.getRepository(CabinetScheduleExceptionEntity)
        await exceptionRepository.save(exceptionRepository.create({
            cabinetId,
            date,
            openTime: null,
            closeTime: null,
            isClosed: true,
        }))

        const response = await createBooking(date)

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('VALIDATION_ERROR')
    })

    it('enforces custom hours from a date exception', async () => {
        const date = futureDate(10)
        const exceptionRepository = AppDataSource.getRepository(CabinetScheduleExceptionEntity)
        await exceptionRepository.save(exceptionRepository.create({
            cabinetId,
            date,
            openTime: '12:00',
            closeTime: '15:00',
            isClosed: false,
        }))

        const response = await createBooking(date)

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('VALIDATION_ERROR')
    })

    it('allows only one of two concurrent requests for the same slot', async () => {
        const date = futureDate(11)

        const responses = await Promise.all([
            createBooking(date, '16:00', '17:00'),
            createBooking(date, '16:00', '17:00'),
        ])
        const statuses = responses.map((response) => response.status).sort()

        expect(statuses).toEqual([200, 409])
        expect(responses.find((response) => response.status === 409)?.body.code)
            .toBe('CONFLICT')
    })

    it('returns one booking for concurrent retries with the same idempotency key', async () => {
        const date = futureDate(12)
        const idempotencyKey = `booking-race-${Date.now()}`
        const input = {
            cabinetId,
            serviceId,
            date,
            startTime: '16:00',
            endTime: '17:00',
            comment: 'Retry-safe booking',
        }

        const responses = await Promise.all([
            request(app.server)
                .post('/bookings')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Origin', 'http://localhost:5173')
                .set('Idempotency-Key', idempotencyKey)
                .send(input),
            request(app.server)
                .post('/bookings')
                .set('Authorization', `Bearer ${clientToken}`)
                .set('Origin', 'http://localhost:5173')
                .set('Idempotency-Key', idempotencyKey)
                .send(input),
        ])

        expect(responses.map((response) => response.status).sort()).toEqual([200, 200])
        expect(responses[0]?.body.id).toBe(responses[1]?.body.id)
        expect(await AppDataSource.getRepository(BookingEntity).countBy({
            clientId,
            idempotencyKey,
        })).toBe(1)

        const mismatchedRetry = await request(app.server)
            .post('/bookings')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .set('Idempotency-Key', idempotencyKey)
            .send({ ...input, endTime: '17:30' })

        expect(mismatchedRetry.status).toBe(409)
        expect(mismatchedRetry.body.code).toBe('CONFLICT')
    })

    it('keeps owner notes private from the client booking response', async () => {
        const bookingRepository = AppDataSource.getRepository(BookingEntity)
        const booking = await bookingRepository.save(bookingRepository.create({
            clientId,
            cabinetId,
            serviceId,
            date: futureDate(30),
            startTime: '18:00',
            endTime: '19:00',
            status: BookingStatus.Pending,
            comment: null,
            cancellationReason: null,
            ownerNote: null,
        }))

        const forbiddenResponse = await request(app.server)
            .patch(`/owner/bookings/${booking.id}/note`)
            .set('Authorization', `Bearer ${availabilityClientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ note: 'Should not be saved' })
        expect(forbiddenResponse.status).toBe(403)

        const updateResponse = await request(app.server)
            .patch(`/owner/bookings/${booking.id}/note`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ note: 'Prepare the room before arrival' })
        expect(updateResponse.status).toBe(200)
        expect(updateResponse.body.ownerNote).toBe('Prepare the room before arrival')

        const clientResponse = await request(app.server)
            .get('/bookings/my')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
        const clientBooking = clientResponse.body.find((item: { id: string }) => item.id === booking.id)

        expect(clientResponse.status).toBe(200)
        expect(clientBooking).toBeDefined()
        expect(clientBooking).not.toHaveProperty('ownerNote')
    })

    it('returns an owner-safe payment ledger only in the owner booking response', async () => {
        const bookingResponse = await createBooking(futureDate(31), '19:00', '20:00')
        expect(bookingResponse.status).toBe(200)

        const bookingId = bookingResponse.body.id as string
        const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
        await paymentRepository.save(paymentRepository.create({
            bookingId,
            grossAmount: 1500,
            commissionAmount: 30,
            ownerPayoutAmount: 1470,
            refundedAmountMinor: 2500,
            currency: 'rub',
            status: BookingPaymentStatus.PartiallyRefunded,
            stripeSessionId: 'cs_private_owner_ledger',
            stripePaymentIntentId: 'pi_private_owner_ledger',
        }))

        const ownerResponse = await request(app.server)
            .get('/owner/bookings')
            .set('Authorization', `Bearer ${ownerToken}`)
            .set('Origin', 'http://localhost:5173')
        const ownerBooking = ownerResponse.body.find((item: { id: string }) => item.id === bookingId)

        expect(ownerResponse.status).toBe(200)
        expect(ownerBooking).toMatchObject({
            id: bookingId,
            paymentLedger: {
                grossAmount: 1500,
                commissionAmount: 30,
                ownerPayoutAmount: 1470,
                refundedAmountMinor: 2500,
                remainingAmountMinor: 147500,
                currency: 'rub',
                status: BookingPaymentStatus.PartiallyRefunded,
            },
        })
        expect(ownerBooking.paymentLedger).not.toHaveProperty('stripeSessionId')
        expect(ownerBooking.paymentLedger).not.toHaveProperty('stripePaymentIntentId')

        const clientResponse = await request(app.server)
            .get('/bookings/my')
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
        const clientBooking = clientResponse.body.find((item: { id: string }) => item.id === bookingId)

        expect(clientResponse.status).toBe(200)
        expect(clientBooking).toBeDefined()
        expect(clientBooking).not.toHaveProperty('paymentLedger')
    })

    it('records and applies an owner-approved reschedule request', async () => {
        const originalDate = futureDate(12)
        const proposedDate = futureDate(13)
        const createResponse = await createBooking(originalDate, '13:00', '14:00')
        expect(createResponse.status).toBe(200)
        const bookingId = createResponse.body.id as string

        const requestResponse = await request(app.server)
            .post(`/bookings/${bookingId}/reschedule`)
            .set('Authorization', `Bearer ${clientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ date: proposedDate, startTime: '14:00', endTime: '15:00' })

        expect(requestResponse.status).toBe(200)
        expect(requestResponse.body.status).toBe('pending')

        const paymentRepository = AppDataSource.getRepository(BookingPaymentEntity)
        await paymentRepository.save(paymentRepository.create({
            bookingId,
            grossAmount: 1000,
            commissionAmount: 20,
            ownerPayoutAmount: 980,
            currency: 'eur',
            status: BookingPaymentStatus.Paid,
            stripeSessionId: 'cs_test_reschedule',
            stripePaymentIntentId: 'pi_test_reschedule',
        }))

        const resolveResponse = await request(app.server)
            .patch(`/owner/bookings/${bookingId}/reschedule`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ decision: 'accepted' })

        expect(resolveResponse.status).toBe(200)
        expect(resolveResponse.body.booking.date).toBe(proposedDate)
        expect(resolveResponse.body.booking.startTime).toBe('14:00')
        expect(resolveResponse.body.request.status).toBe('accepted')
        expect(resolveResponse.body.paymentStatus).toBe('paid')
        expect((await paymentRepository.findOneByOrFail({ bookingId })).status)
            .toBe(BookingPaymentStatus.Paid)

        const historyResponse = await request(app.server)
            .get(`/bookings/${bookingId}/history`)
            .set('Authorization', `Bearer ${clientToken}`)

        expect(historyResponse.status).toBe(200)
        expect(historyResponse.body.some((entry: { reason: string | null }) =>
            entry.reason?.startsWith('Rescheduled from ')
        )).toBe(true)
    })

    it('enforces an owner-configured timed block', async () => {
        const blockedDate = futureDate(14)
        const updateResponse = await request(app.server)
            .put(`/owner/cabinets/${cabinetId}/blocked-periods`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({
                items: [
                    {
                        date: blockedDate,
                        startTime: '10:30',
                        endTime: '11:30',
                        kind: 'blocked',
                        reason: 'Maintenance',
                    },
                ],
            })

        expect(updateResponse.status).toBe(200)
        expect(updateResponse.body.items).toHaveLength(1)

        const overlappingResponse = await request(app.server)
            .post('/bookings')
            .set('Authorization', `Bearer ${availabilityClientToken}`)
            .set('Origin', 'http://localhost:5173')
            .send({ cabinetId, serviceId, date: blockedDate, startTime: '10:00', endTime: '11:00' })
        expect(overlappingResponse.status).toBe(400)

    })
})
