import type { BookingStatus } from '../../entities/booking/booking.entity.js'
import type { BookingPaymentStatus } from '../../entities/booking/booking-payment.entity.js'

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

export type OwnerPaymentLedger = {
    grossAmount: number
    commissionAmount: number
    ownerPayoutAmount: number
    refundedAmountMinor: number
    remainingAmountMinor: number
    currency: string
    status: BookingPaymentStatus
    createdAt: Date
}

export type OwnerBooking = ClientBooking & {
    client: BookingClient
    ownerNote: string | null
    paymentLedger: OwnerPaymentLedger | null
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
