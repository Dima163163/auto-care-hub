import { z } from 'zod'

import type { Cabinet } from '../model/types'

const cabinetPhotoUrlSchema = z.string()
    .transform((value) => value.trim())
    .refine((value) => {
        if (
            value.length === 0 ||
            value.length > 2_048 ||
            value.includes('\\') ||
            value.includes('/../') ||
            value.startsWith('//')
        ) {
            return false
        }

        if (value.startsWith('/')) return true

        try {
            return new URL(value).protocol === 'https:'
        } catch {
            return false
        }
    }, 'Cabinet photo URL must be an internal path or HTTPS URL.')

const availabilityPreviewSchema = z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    freeSlots: z.number().int().nonnegative(),
    slots: z.array(z.object({
        startTime: z.string(),
        endTime: z.string(),
    })),
})

const cabinetImageAssetVariantSchema = z.object({
    url: cabinetPhotoUrlSchema,
    contentType: z.string().min(1),
    bytes: z.number().int().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    checksum: z.string().length(64),
    version: z.string().min(1),
})

const cabinetImageAssetSchema = z.object({
    original: z.object({
        url: cabinetPhotoUrlSchema,
        contentType: z.string().nullable(),
        bytes: z.number().int().positive().nullable(),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        checksum: z.string().length(64).nullable(),
        version: z.string().min(1).nullable(),
    }),
    fallbackUrl: cabinetPhotoUrlSchema,
    thumbnail: cabinetImageAssetVariantSchema.optional(),
    preview: cabinetImageAssetVariantSchema.optional(),
})

export const cabinetSchema = z.object({
    id: z.string(),
    ownerId: z.string(),
    title: z.string(),
    description: z.string(),
    address: z.string(),
    city: z.string(),
    timezone: z.string().optional(),
    pricePerHour: z.number().nonnegative(),
    status: z.enum(['draft', 'active', 'blocked']),
    photos: z.array(cabinetPhotoUrlSchema),
    photoAssets: z.array(cabinetImageAssetSchema).optional(),
    amenities: z.array(z.string()).optional(),
    cancellationPolicy: z.string().nullable().optional(),
    houseRules: z.string().nullable().optional(),
    createdAt: z.string(),
    availabilityPreview: availabilityPreviewSchema.nullable().optional(),
}) satisfies z.ZodType<Cabinet>

const cabinetPageSchema = z.object({
    items: z.array(cabinetSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
})

const uploadCabinetImageResponseSchema = z.object({
    url: cabinetPhotoUrlSchema,
})

const deleteCabinetResponseSchema = z.object({
    success: z.literal(true),
})

export type CabinetPageResponse = z.infer<typeof cabinetPageSchema>

export function normalizeCabinetResponse(value: unknown): Cabinet {
    return cabinetSchema.parse(value)
}

export function normalizeCabinetListResponse(value: unknown): Cabinet[] {
    return z.array(cabinetSchema).parse(value)
}

export function normalizeCabinetPageResponse(value: unknown): CabinetPageResponse {
    return cabinetPageSchema.parse(value)
}

export function normalizeUploadCabinetImageResponse(value: unknown) {
    return uploadCabinetImageResponseSchema.parse(value)
}

export function normalizeDeleteCabinetResponse(value: unknown) {
    return deleteCabinetResponseSchema.parse(value)
}
