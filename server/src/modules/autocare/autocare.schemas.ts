import { z } from 'zod'

export const autoCareDiscoveryQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
    marketId: z.string().uuid().optional(),
    radiusKm: z.coerce.number().finite().positive().max(500).default(25),
    sort: z.enum(['recommended', 'price_asc', 'rating_desc', 'distance_asc']).default('recommended'),
    cursor: z.string().trim().max(2_048).optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
})

export const autoCareProviderParamsSchema = z.object({
    providerId: z.string().uuid(),
})

export const autoCareProviderOffersQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
})
