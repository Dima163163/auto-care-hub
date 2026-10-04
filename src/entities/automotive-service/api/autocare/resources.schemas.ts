import { z } from 'zod'
import type { AutoCareCapacityReservation, AutoCareCapacityResource } from './resources.types'

export const autoCareCapacityResourceSchema = z.object({
    id: z.string(),
    providerId: z.string(),
    locationId: z.string(),
    type: z.enum(['specialist', 'bay', 'lift', 'equipment']),
    name: z.string(),
    capacity: z.number().int().min(1),
    active: z.boolean(),
    metadata: z.record(z.string(), z.unknown()),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
}) satisfies z.ZodType<AutoCareCapacityResource>

export const autoCareCapacityReservationSchema = z.object({
    id: z.string(),
    requestId: z.string(),
    resourceId: z.string(),
    providerId: z.string(),
    locationId: z.string(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    status: z.enum(['active', 'released']),
    releasedAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }),
}) satisfies z.ZodType<AutoCareCapacityReservation>
