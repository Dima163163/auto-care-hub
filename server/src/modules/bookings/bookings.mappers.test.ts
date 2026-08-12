import { describe, expect, it } from 'vitest'

import type { BookingEntity } from '../../entities/booking/booking.entity.js'
import type { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'
import { toOwnerBooking } from './bookings.mappers.js'

function createBooking(): BookingEntity {
    return {
        id: 'booking-1',
        clientId: 'client-1',
        cabinetId: 'cabinet-1',
        serviceId: 'service-1',
        date: '2026-08-01',
        startTime: '10:00:00',
        endTime: '11:00:00',
        status: 'confirmed',
        comment: null,
        idempotencyKey: null,
        cancellationReason: null,
        ownerNote: null,
        createdAt: new Date('2026-08-01T08:00:00.000Z'),
        cabinet: {
            id: 'cabinet-1',
            title: 'Studio',
            address: 'Main 1',
            city: 'Samara',
        },
        service: {
            id: 'service-1',
            title: 'Portrait',
            durationMinutes: 60,
            price: 1500,
        },
        client: {
            id: 'client-1',
            name: 'Alex',
            email: 'alex@example.com',
            phone: null,
        },
    } as BookingEntity
}

describe('booking owner mapper', () => {
    it('exposes only owner-safe payment ledger fields', () => {
        const payment = {
            id: 'payment-1',
            bookingId: 'booking-1',
            grossAmount: 1500,
            commissionAmount: 30,
            ownerPayoutAmount: 1470,
            refundedAmountMinor: 2500,
            currency: 'rub',
            status: BookingPaymentStatus.PartiallyRefunded,
            stripeSessionId: 'cs_private',
            stripePaymentIntentId: 'pi_private',
            createdAt: new Date('2026-08-01T08:01:00.000Z'),
        } as BookingPaymentEntity

        const result = toOwnerBooking(createBooking(), payment)

        expect(result.paymentLedger).toEqual({
            grossAmount: 1500,
            commissionAmount: 30,
            ownerPayoutAmount: 1470,
            refundedAmountMinor: 2500,
            remainingAmountMinor: 147500,
            currency: 'rub',
            status: BookingPaymentStatus.PartiallyRefunded,
            createdAt: new Date('2026-08-01T08:01:00.000Z'),
        })
        expect(result.paymentLedger).not.toHaveProperty('stripeSessionId')
        expect(result.paymentLedger).not.toHaveProperty('stripePaymentIntentId')
    })

    it('keeps the ledger empty when a booking has no payment', () => {
        expect(toOwnerBooking(createBooking()).paymentLedger).toBeNull()
    })
})
