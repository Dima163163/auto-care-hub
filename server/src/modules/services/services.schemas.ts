import { z } from 'zod'

export const servicesQuerySchema = z.object({
    cabinetId: z.string().uuid('Cabinet id must be a valid UUID.'),
})

export const serviceParamsSchema = z.object({
    id: z.string().uuid('Service id must be a valid UUID.'),
})

export const createOwnerServiceSchema = z.object({
    cabinetId: z.string().uuid('Cabinet id must be a valid UUID.'),
    title: z.string().trim().min(2, 'Title must contain at least 2 characters.').max(160),
    description: z
        .string()
        .max(500, 'Description must be at most 500 characters.')
        .optional(),
    durationMinutes: z.coerce
        .number()
        .int('Duration must be an integer.')
        .positive('Duration must be greater than 0.')
        .max(1_440),
    price: z.coerce
        .number()
        .int('Price must be an integer.')
        .positive('Price must be greater than 0.')
        .max(1_000_000),
    isActive: z.boolean().optional(),
})

export const updateOwnerServiceSchema = z
    .object({
        title: z
            .string().trim()
            .min(2, 'Title must contain at least 2 characters.')
            .max(160)
            .optional(),
        description: z
            .string()
            .max(500, 'Description must be at most 500 characters.')
            .nullable()
            .optional(),
        durationMinutes: z.coerce
            .number()
            .int('Duration must be an integer.')
            .positive('Duration must be greater than 0.')
            .max(1_440)
            .optional(),
        price: z.coerce
            .number()
            .int('Price must be an integer.')
            .positive('Price must be greater than 0.')
            .max(1_000_000)
            .optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field must be provided.',
        path: ['body'],
    })

export const updateOwnerServiceStatusSchema = z.object({
    isActive: z.boolean(),
})
