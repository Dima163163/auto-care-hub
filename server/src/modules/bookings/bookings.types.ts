import type { BookingStatus } from '../../entities/booking/booking.entity.js'

export type PublicBooking = {
    id: string
    clientId: string
    cabinetId: string
    serviceId: string
    date: string
    startTime: string
    endTime: string
    status: BookingStatus
    comment: string | null
    cancellationReason: string | null
    createdAt: Date
}

export type BookingClient = {
    id: string
    name: string
    email: string
    phone: string | null
}

export type BookingCabinet = {
    id: string
    title: string
    address: string
    city: string
}

export type BookingService = {
    id: string
    title: string
    durationMinutes: number
    price: number
}

export type ClientBooking = PublicBooking & {
    cabinet: BookingCabinet
    service: BookingService
}

export type OwnerBooking = ClientBooking & {
    client: BookingClient
    ownerNote: string | null
}

export type BookingStatusHistory = {
    id: string
    status: BookingStatus
    changedById: string | null
    reason: string | null
    createdAt: Date
}

export type BookingRescheduleRequest = {
    id: string
    bookingId: string
    proposedDate: string
    proposedStartTime: string
    proposedEndTime: string
    status: 'pending' | 'accepted' | 'rejected'
    resolutionReason: string | null
    createdAt: Date
    resolvedAt: Date | null
}
