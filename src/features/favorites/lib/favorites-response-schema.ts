import type { Cabinet } from '@/entities/cabinet'
import {
    cabinetSchema,
    normalizeCabinetListResponse,
    normalizeCabinetResponse,
} from '@/entities/cabinet/lib/cabinet-response-schema'
import { z } from 'zod'

const favoritesResponseSchema = z.object({
    items: z.array(cabinetSchema),
})

const favoriteSuccessResponseSchema = z.object({
    success: z.literal(true),
})

export function normalizeFavoritesResponse(value: unknown): Cabinet[] {
    return Array.isArray(value)
        ? normalizeCabinetListResponse(value)
        : favoritesResponseSchema.parse(value).items
}

export function normalizeFavoriteResponse(value: unknown): Cabinet {
    return normalizeCabinetResponse(value)
}

export function normalizeFavoriteSuccessResponse(value: unknown) {
    return favoriteSuccessResponseSchema.parse(value)
}
