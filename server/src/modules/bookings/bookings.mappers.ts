import type { BookingEntity } from '../../entities/booking/booking.entity.js'
import type { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import { getRemainingPaymentAmountMinor } from '../payments/payment-money.js'
import type {
    ClientBooking,
    OwnerBooking,
    OwnerPaymentLedger,
    PublicBooking,
} from './bookings.types.js'

function normalizeTime(time: string) {
    return time.slice(0, 5)
}

export function toPublicBooking(booking: BookingEntity): PublicBooking {
    return {
        id: booking.id,
        clientId: booking.clientId,
        cabinetId: booking.cabinetId,
        serviceId: booking.serviceId,
        date: booking.date,
        startTime: normalizeTime(booking.startTime),
        endTime: normalizeTime(booking.endTime),
        status: booking.status,
        comment: booking.comment,
        cancellationReason: booking.cancellationReason,
        createdAt: booking.createdAt,
    }
}

export function toClientBooking(booking: BookingEntity): ClientBooking {
    return {
        ...toPublicBooking(booking),
        cabinet: {
            id: booking.cabinet.id,
            title: booking.cabinet.title,
            address: booking.cabinet.address,
            city: booking.cabinet.city,
        },
        service: {
            id: booking.service.id,
            title: booking.service.title,
            durationMinutes: booking.service.durationMinutes,
            price: booking.service.price,
        },
    }
}

export function toOwnerPaymentLedger(
    payment: BookingPaymentEntity | null,
): OwnerPaymentLedger | null {
    if (!payment) return null

    const refundedAmountMinor = payment.refundedAmountMinor ?? 0

    return {
        grossAmount: payment.grossAmount,
        commissionAmount: payment.commissionAmount,
        ownerPayoutAmount: payment.ownerPayoutAmount,
        refundedAmountMinor,
        remainingAmountMinor: getRemainingPaymentAmountMinor(
            payment.grossAmount,
            refundedAmountMinor,
        ),
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
    }
}

export function toOwnerBooking(
    booking: BookingEntity,
    payment: BookingPaymentEntity | null = null,
): OwnerBooking {
    return {
        ...toClientBooking(booking),
        ownerNote: booking.ownerNote,
        client: {
            id: booking.client.id,
            name: booking.client.name,
            email: booking.client.email,
            phone: booking.client.phone,
        },
        paymentLedger: toOwnerPaymentLedger(payment),
    }
}
