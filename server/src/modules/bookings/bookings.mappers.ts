import type { BookingEntity } from '../../entities/booking/booking.entity.js'
import type {
    ClientBooking,
    OwnerBooking,
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

export function toOwnerBooking(
    booking: BookingEntity,
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
    }
}
