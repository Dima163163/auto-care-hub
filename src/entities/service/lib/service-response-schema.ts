import { z } from 'zod'

import type { Service } from '../model/types'

const serviceSchema = z.object({
    id: z.string(),
    cabinetId: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    durationMinutes: z.number().int().positive().max(1_440),
    price: z.number().int().positive().max(1_000_000),
    isActive: z.boolean(),
}) satisfies z.ZodType<Service>

const deleteServiceResponseSchema = z.object({
    success: z.literal(true),
})

export function normalizeServiceResponse(value: unknown): Service {
    return serviceSchema.parse(value)
}

export function normalizeServiceListResponse(value: unknown): Service[] {
    return z.array(serviceSchema).parse(value)
}

export function normalizeDeleteServiceResponse(value: unknown) {
    return deleteServiceResponseSchema.parse(value)
}
