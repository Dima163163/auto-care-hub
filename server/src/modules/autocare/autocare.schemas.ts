import { z } from 'zod'

export const autoCareDiscoveryQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
    marketId: z.string().trim().min(1).max(120).optional(),
    radiusKm: z.coerce.number().finite().positive().max(500).default(25),
    sort: z.enum(['recommended', 'price_asc', 'rating_desc', 'distance_asc']).default('recommended'),
    cursor: z.string().trim().max(2_048).optional(),
    limit: z.coerce.number().int().positive().max(50).default(20),
    minPrice: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
    maxPrice: z.coerce.number().finite().nonnegative().max(1_000_000).optional(),
    minRating: z.coerce.number().finite().min(0).max(5).optional(),
    priceType: z.enum(['fixed', 'from', 'range', 'quote_required']).optional(),
    availableToday: z.coerce.boolean().optional(),
    verifiedOnly: z.coerce.boolean().optional(),
    warrantyOnly: z.coerce.boolean().optional(),
    hasBonus: z.coerce.boolean().optional(),
    inclusion: z.string().trim().min(1).max(80).optional(),
    brandId: z.string().trim().min(1).max(80).optional(),
}).superRefine((value, context) => {
    if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
        context.addIssue({ code: 'custom', path: ['minPrice'], message: 'minPrice must not exceed maxPrice' })
    }
})

export const autoCareProviderParamsSchema = z.object({
    providerId: z.string().uuid(),
})

export const autoCareProviderOffersQuerySchema = z.object({
    serviceId: z.string().trim().min(1).max(120).optional(),
})
