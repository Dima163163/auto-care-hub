import { z } from 'zod'

import { CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { env } from '../../config/env.js'
import { isValidTimeZone } from '../../shared/date-time/cabinet-timezone.js'
import { isAllowedCabinetPhotoUrl } from './cabinet-photo-url.js'

const cabinetStatusSchema = z.enum(CabinetStatus)

const photoSchema = z
    .string()
    .trim()
    .max(2048, 'Photo URL must be at most 2048 characters.')
    .refine(
        (value) => isAllowedCabinetPhotoUrl(value, env.cabinetPhotoAllowedHosts),
        'Photo must be an owned upload or an allowlisted HTTPS URL.'
    )
const photosSchema = z.array(photoSchema).max(20)
const amenitiesSchema = z.array(z.string().trim().min(1).max(80)).max(20)
const policySchema = z.string().trim().max(2000).nullable()
const timezoneSchema = z.string().min(1).max(80).refine(isValidTimeZone, 'Timezone must be a valid IANA timezone.')
const cabinetImageMimeTypeSchema = z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
])

const booleanQuerySchema = z.preprocess(
    (value) => {
        if (value === 'true') return true
        if (value === 'false') return false
        return value
    },
    z.boolean().optional(),
)

export const MAX_CABINET_IMAGE_SIZE_BYTES = 1024 * 1024
export const MAX_CABINET_IMAGE_BASE64_LENGTH = Math.ceil(
    MAX_CABINET_IMAGE_SIZE_BYTES / 3
) * 4

export const cabinetParamsSchema = z.object({
    id: z.string().uuid('Cabinet id must be a valid UUID.'),
})

export const publicCabinetsQuerySchema = z.object({
    search: z.string().trim().max(120).optional(),
    sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'popular']).optional(),
    city: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    minPrice: z.coerce.number().int().nonnegative().max(1_000_000).optional(),
    maxPrice: z.coerce.number().int().nonnegative().max(1_000_000).optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    service: z.string().trim().max(120).optional(),
    availableToday: booleanQuerySchema,
    availabilityDate: z.string().date().optional(),
    durationMinutes: z.coerce.number().int().min(15).max(1_440).optional(),
    page: z.coerce.number().int().positive().max(1_000).optional(),
    limit: z.coerce.number().int().positive().max(50).optional(),
}).refine(
    (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
    {
        message: 'Minimum price must not exceed maximum price.',
        path: ['minPrice'],
    },
)

export const createOwnerCabinetSchema = z.object({
    title: z.string().trim().min(2, 'Title must contain at least 2 characters.').max(160),
    description: z
        .string().trim()
        .min(10, 'Description must contain at least 10 characters.')
        .max(5_000),
    address: z.string().trim().min(2, 'Address must contain at least 2 characters.').max(240),
    city: z.string().trim().min(2, 'City must contain at least 2 characters.').max(120),
    timezone: timezoneSchema.optional(),
    pricePerHour: z.coerce
        .number()
        .int('Price per hour must be an integer.')
        .positive('Price per hour must be greater than 0.')
        .max(1_000_000),
    status: cabinetStatusSchema.optional(),
    photos: photosSchema.optional(),
    amenities: amenitiesSchema.optional(),
    cancellationPolicy: policySchema.optional(),
    houseRules: policySchema.optional(),
})

export const uploadCabinetImageSchema = z.object({
    fileName: z.string().min(1, 'File name is required.').max(255),
    mimeType: cabinetImageMimeTypeSchema,
    size: z
        .number()
        .int('File size must be an integer.')
        .positive('File size must be greater than 0.')
        .max(
            MAX_CABINET_IMAGE_SIZE_BYTES,
            'Image must be 1 MB or smaller.'
        ),
    contentBase64: z
        .string()
        .min(1, 'Image content is required.')
        .max(MAX_CABINET_IMAGE_BASE64_LENGTH),
})

export const updateOwnerCabinetSchema = z
    .object({
        title: z
            .string().trim()
            .min(2, 'Title must contain at least 2 characters.')
            .max(160)
            .optional(),
        description: z
            .string().trim()
            .min(10, 'Description must contain at least 10 characters.')
            .max(5_000)
            .optional(),
        address: z
            .string().trim()
            .min(2, 'Address must contain at least 2 characters.')
            .max(240)
            .optional(),
        city: z
            .string().trim()
            .min(2, 'City must contain at least 2 characters.')
            .max(120)
            .optional(),
        timezone: timezoneSchema.optional(),
        pricePerHour: z.coerce
            .number()
            .int('Price per hour must be an integer.')
            .positive('Price per hour must be greater than 0.')
            .max(1_000_000)
            .optional(),
        status: cabinetStatusSchema.optional(),
        photos: photosSchema.optional(),
        amenities: amenitiesSchema.optional(),
        cancellationPolicy: policySchema.optional(),
        houseRules: policySchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field must be provided.',
        path: ['body'],
    })
