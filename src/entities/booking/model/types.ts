import type { EntityId, ISODateString } from '@/shared/types/common'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type BookingStatusHistory = {
    id: EntityId
    status: BookingStatus
    changedById: EntityId | null
    reason: string | null
    createdAt: string
}

export type BookingRescheduleRequest = {
    id: EntityId
    bookingId: EntityId
    proposedDate: ISODateString
    proposedStartTime: string
    proposedEndTime: string
    status: 'pending' | 'accepted' | 'rejected'
    resolutionReason: string | null
    createdAt: ISODateString
    resolvedAt: ISODateString | null
}

export type ResolveBookingRescheduleResponse = {
    request: BookingRescheduleRequest
    booking: OwnerBooking
}

export type Booking = {
    id: EntityId
    clientId: EntityId
    cabinetId: EntityId
    serviceId: EntityId
    date: ISODateString
    startTime: string
    endTime: string
    status: BookingStatus
    comment?: string | null | undefined
    cancellationReason?: string | null | undefined
    createdAt: ISODateString
}

export type BookingCabinetSummary = {
    id: EntityId
    title: string
    address: string
    city: string
}

export type BookingServiceSummary = {
    id: EntityId
    title: string
    durationMinutes: number
    price: number
}

export type ClientBooking = Booking & {
    cabinet: BookingCabinetSummary
    service: BookingServiceSummary
}

export type OwnerBookingClientSummary = {
    id: EntityId
    name: string
    email: string
    phone: string | null
}

export type OwnerBooking = ClientBooking & {
    client: OwnerBookingClientSummary
    ownerNote: string | null
}
