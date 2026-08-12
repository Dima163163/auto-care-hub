import { z } from 'zod'
import { BookingStatus } from '../../entities/booking/booking.entity.js'

const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')

const timeSchema = z
    .string()
    .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        'Time must be in HH:mm format.'
    )

const bookingStatusSchema = z.enum(BookingStatus)

export const bookingListQuerySchema = z.object({
    cursor: z.string().trim().max(512).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: bookingStatusSchema.optional(),
    fromDate: dateSchema.optional(),
    toDate: dateSchema.optional(),
}).refine(
    (value) => value.fromDate === undefined || value.toDate === undefined || value.fromDate <= value.toDate,
    {
        message: 'fromDate must not be later than toDate.',
        path: ['fromDate'],
    },
)

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>

function timeToMinutes(time: string) {
    const [hours = '0', minutes = '0'] = time.split(':')

    return Number(hours) * 60 + Number(minutes)
}

const createBookingBaseSchema = z.object({
    cabinetId: z.string().uuid('Cabinet id must be a valid UUID.'),
    serviceId: z.string().uuid('Service id must be a valid UUID.'),
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    experiment: z.enum(['book_again']).optional(),
    sourceBookingId: z.string().uuid('Source booking id must be a valid UUID.').optional(),
    comment: z
        .string()
        .max(500, 'Comment must be at most 500 characters.')
        .optional(),
})

function refineBookingTime<TSchema extends typeof createBookingBaseSchema>(
    schema: TSchema
) {
    return schema.refine(
        (value) => timeToMinutes(value.endTime) > timeToMinutes(value.startTime),
        {
            message: 'End time must be later than start time.',
            path: ['endTime'],
        }
    )
}

export const createBookingSchema = refineBookingTime(createBookingBaseSchema).superRefine((value, context) => {
    if (value.experiment === 'book_again' && !value.sourceBookingId) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['sourceBookingId'],
            message: 'Book again requires a source booking.',
        })
    }

    if (value.experiment !== 'book_again' && value.sourceBookingId) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['sourceBookingId'],
            message: 'Source booking is only valid for Book again.',
        })
    }
})

export const ownerCreateBookingSchema = refineBookingTime(
    createBookingBaseSchema.extend({
        clientId: z.string().uuid('Client id must be a valid UUID.'),
    })
)

export const bookingParamsSchema = z.object({
    id: z.string().uuid('Booking id must be a valid UUID.'),
})

export const cancelBookingSchema = z.object({
    reason: z.string().trim().min(1).max(500),
})

export const updateBookingStatusSchema = z.object({
    status: bookingStatusSchema,
})

export const updateOwnerBookingNoteSchema = z.object({
    note: z
        .string()
        .trim()
        .max(1000, 'Owner note must be at most 1000 characters.')
        .nullable()
        .transform((value) => value === '' ? null : value),
})

export const requestBookingRescheduleSchema = createBookingBaseSchema
    .pick({ date: true, startTime: true, endTime: true })
    .refine(
        (value) => timeToMinutes(value.endTime) > timeToMinutes(value.startTime),
        { message: 'End time must be later than start time.', path: ['endTime'] }
    )

export const resolveBookingRescheduleSchema = z.object({
    decision: z.enum(['accepted', 'rejected']),
    reason: z.string().trim().max(500).optional(),
})

export const ownerActionCenterEventSchema = z.object({
    action: z.enum([
        'pending_bookings',
        'reschedule_requests',
        'draft_cabinets',
        'blocked_cabinets',
        'readiness',
    ]),
})

export const clientExperimentEventSchema = z.object({
    event: z.enum([
        'book_again_clicked',
        'preference_shortcut_used',
        'preference_shortcut_reset',
        'catalog_filter_used',
        'catalog_filter_reset',
        'catalog_search_to_detail',
        'catalog_search_to_book',
        'catalog_no_results',
    ]),
})
