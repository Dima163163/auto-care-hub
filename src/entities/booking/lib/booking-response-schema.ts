import { z } from 'zod'

import type {
    Booking,
    BookingRescheduleRequest,
    ResolveBookingRescheduleResponse,
    BookingStatusHistory,
    ClientBooking,
    OwnerBooking,
} from '../model/types'

const bookingStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed'])

const bookingSchema = z.object({
    id: z.string(),
    clientId: z.string(),
    cabinetId: z.string(),
    serviceId: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    status: bookingStatusSchema,
    comment: z.string().nullable().optional(),
    cancellationReason: z.string().nullable().optional(),
    createdAt: z.string(),
}) satisfies z.ZodType<Booking>

const clientBookingSchema = bookingSchema.extend({
    cabinet: z.object({
        id: z.string(),
        title: z.string(),
        address: z.string(),
        city: z.string(),
    }),
    service: z.object({
        id: z.string(),
        title: z.string(),
        durationMinutes: z.number().int().positive(),
        price: z.number().nonnegative(),
    }),
}) satisfies z.ZodType<ClientBooking>

const ownerBookingSchema = clientBookingSchema.extend({
    client: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        phone: z.string().nullable(),
    }),
    ownerNote: z.string().nullable(),
}) satisfies z.ZodType<OwnerBooking>

const bookingStatusHistorySchema = z.object({
    id: z.string(),
    status: bookingStatusSchema,
    changedById: z.string().nullable(),
    reason: z.string().nullable(),
    createdAt: z.string(),
}) satisfies z.ZodType<BookingStatusHistory>

const rescheduleRequestSchema = z.object({
    id: z.string(),
    bookingId: z.string(),
    proposedDate: z.string(),
    proposedStartTime: z.string(),
    proposedEndTime: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']),
    resolutionReason: z.string().nullable(),
    createdAt: z.string(),
    resolvedAt: z.string().nullable(),
}) satisfies z.ZodType<BookingRescheduleRequest>

const occupiedSlotSchema = z.object({
    start: z.string(),
    end: z.string(),
})

const resolveBookingRescheduleResponseSchema = z.object({
    request: rescheduleRequestSchema,
    booking: ownerBookingSchema,
}) satisfies z.ZodType<ResolveBookingRescheduleResponse>

export function normalizeBookingResponse(value: unknown): Booking {
    return bookingSchema.parse(value)
}

export function normalizeClientBookingResponse(value: unknown): ClientBooking {
    return clientBookingSchema.parse(value)
}

export function normalizeOwnerBookingResponse(value: unknown): OwnerBooking {
    return ownerBookingSchema.parse(value)
}

export function normalizeClientBookingListResponse(value: unknown): ClientBooking[] {
    return z.array(clientBookingSchema).parse(value)
}

export function normalizeOwnerBookingListResponse(value: unknown): OwnerBooking[] {
    const response = z.union([
        z.array(ownerBookingSchema),
        z.object({
            items: z.array(ownerBookingSchema),
            nextCursor: z.string().nullable(),
        }),
    ]).parse(value)

    return Array.isArray(response) ? response : response.items
}

export function normalizeBookingStatusHistoryResponse(value: unknown): BookingStatusHistory[] {
    return z.array(bookingStatusHistorySchema).parse(value)
}

export function normalizeRescheduleRequestResponse(value: unknown): BookingRescheduleRequest {
    return rescheduleRequestSchema.parse(value)
}

export function normalizeRescheduleRequestListResponse(value: unknown): BookingRescheduleRequest[] {
    return z.array(rescheduleRequestSchema).parse(value)
}

export function normalizeResolveBookingRescheduleResponse(value: unknown): ResolveBookingRescheduleResponse {
    return resolveBookingRescheduleResponseSchema.parse(value)
}

export function normalizeOccupiedSlotsResponse(value: unknown): OccupiedSlot[] {
    return z.array(occupiedSlotSchema).parse(value)
}

type OccupiedSlot = {
    start: string
    end: string
}
