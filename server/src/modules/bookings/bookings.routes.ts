import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import {
    validateBody,
    validateParams,
} from '../../shared/validation/validate.js'
import {
    bookingParamsSchema,
    bookingListQuerySchema,
    cancelBookingSchema,
    createBookingSchema,
    ownerCreateBookingSchema,
    requestBookingRescheduleSchema,
    resolveBookingRescheduleSchema,
    ownerActionCenterEventSchema,
    clientExperimentEventSchema,
    updateBookingStatusSchema,
    updateOwnerBookingNoteSchema,
} from './bookings.schemas.js'
import {
    cancelClientBooking,
    getBookingStatusHistory,
    createClientBooking,
    createOwnerBooking,
    getClientBookings,
    getOccupiedSlots,
    getOwnerBookings,
    getOwnerPendingRescheduleRequests,
    requestClientBookingReschedule,
    resolveOwnerBookingReschedule,
    recordOwnerActionCenterEvent,
    recordClientExperimentEventFromRoute,
    updateOwnerBookingNote,
    updateOwnerBookingStatus,
} from './bookings.service.js'
import type { ClientExperimentEventName } from './client-experiment-metrics.js'
import type {
    ClientBooking,
    OwnerBooking,
    PublicBooking,
} from './bookings.types.js'
import { getOptionalIdempotencyKey } from '../../shared/http/idempotency-key.js'
import { validateQuery } from '../../shared/validation/validate.js'

import { env } from '../../config/env.js'
import {
    createRateLimitPreHandler,
    getAuthenticatedUserRateLimitIdentifier,
} from '../../shared/security/rate-limit.js'

type BookingResponse = PublicBooking
type ClientBookingsListResponse = ClientBooking[] | { items: ClientBooking[]; nextCursor: string | null }
type OwnerBookingResponse = OwnerBooking
type OwnerBookingsListResponse = OwnerBooking[] | { items: OwnerBooking[]; nextCursor: string | null }
type OccupiedSlotsResponse = { start: string; end: string }[]

const createBookingRateLimit = createRateLimitPreHandler({
    maxRequests: 10,
    scope: 'booking:create',
    windowMs: 60 * 1000,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

const ownerActionCenterEventRateLimit = createRateLimitPreHandler({
    maxRequests: 30,
    scope: 'owner-action-center:event',
    windowMs: 60 * 1000,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

const clientExperimentEventRateLimit = createRateLimitPreHandler({
    maxRequests: 60,
    scope: 'client-experiment:event',
    windowMs: 60 * 1000,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

export async function bookingsRoutes(
    app: FastifyInstance
) {
    app.post<{ Body: unknown; Reply: BookingResponse }>(
        '/bookings',
        {
            preHandler: createBookingRateLimit,
        },
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const body = validateBody(createBookingSchema, request.body)

            return createClientBooking(
                user,
                { ...body, idempotencyKey: getOptionalIdempotencyKey(request.headers) },
                env.frontendOrigin,
            )
        }
    )

    app.get<{ Querystring: unknown; Reply: ClientBookingsListResponse }>(
        '/bookings/my',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(bookingListQuerySchema, request.query)

            return getClientBookings(user, query)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: BookingResponse }>(
        '/bookings/:id/cancel',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(bookingParamsSchema, request.params)
            const body = validateBody(cancelBookingSchema, request.body)

            return cancelClientBooking(user, params.id, body.reason, env.frontendOrigin)
        }
    )

    app.get<{ Params: unknown; Reply: unknown }>(
        '/bookings/:id/history',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(bookingParamsSchema, request.params)
            return getBookingStatusHistory(user, params.id)
        }
    )

    app.post<{ Params: unknown; Body: unknown; Reply: unknown }>(
        '/bookings/:id/reschedule',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(bookingParamsSchema, request.params)
            const body = validateBody(requestBookingRescheduleSchema, request.body)
            return requestClientBookingReschedule(user, params.id, body)
        }
    )

    app.get<{ Querystring: unknown; Reply: OwnerBookingsListResponse }>(
        '/owner/bookings',
        async (request) => {
            const user = await requireAuth(request)
            const query = validateQuery(bookingListQuerySchema, request.query)

            return getOwnerBookings(user, query)
        }
    )

    app.get<{ Reply: unknown }>(
        '/owner/bookings/reschedule-requests',
        async (request) => {
            const user = await requireAuth(request)

            return getOwnerPendingRescheduleRequests(user)
        }
    )

    app.post<{ Body: unknown; Reply: { accepted: true } }>(
        '/owner/action-center/events',
        {
            preHandler: ownerActionCenterEventRateLimit,
        },
        async (request, reply) => {
            const user = await requireAuth(request)
            const body = validateBody(ownerActionCenterEventSchema, request.body)

            reply.header('cache-control', 'no-store')

            return recordOwnerActionCenterEvent(user, body.action)
        }
    )

    app.post<{ Body: unknown; Reply: { accepted: true } }>(
        '/client/experiment-events',
        {
            preHandler: clientExperimentEventRateLimit,
        },
        async (request, reply) => {
            const user = await requireAuth(request)
            const body = validateBody(clientExperimentEventSchema, request.body)

            reply.header('cache-control', 'no-store')

            return recordClientExperimentEventFromRoute(
                user,
                body.event as ClientExperimentEventName,
            )
        }
    )

    app.post<{ Body: unknown; Reply: OwnerBookingResponse }>(
        '/owner/bookings',
        {
            preHandler: createBookingRateLimit,
        },
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const body = validateBody(ownerCreateBookingSchema, request.body)

            return createOwnerBooking(user, body, env.frontendOrigin)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: unknown }>(
        '/owner/bookings/:id/reschedule',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(bookingParamsSchema, request.params)
            const body = validateBody(resolveBookingRescheduleSchema, request.body)
            return resolveOwnerBookingReschedule(user, params.id, body)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: OwnerBookingResponse }>(
        '/owner/bookings/:id/note',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(bookingParamsSchema, request.params)
            const body = validateBody(updateOwnerBookingNoteSchema, request.body)

            return updateOwnerBookingNote(user, params.id, body.note)
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: OwnerBookingResponse }>(
        '/bookings/:id/status',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(bookingParamsSchema, request.params)
            const body = validateBody(updateBookingStatusSchema, request.body)

            return updateOwnerBookingStatus(user, params.id, body.status, env.frontendOrigin)
        }
    )

    app.get<{
        Querystring: { cabinetId: string; date: string }
        Reply: OccupiedSlotsResponse
    }>('/bookings/occupied', async (request) => {
        const { cabinetId, date } = request.query
        return getOccupiedSlots(cabinetId, date)
    })
}
