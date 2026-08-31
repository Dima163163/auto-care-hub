import { z } from 'zod'

import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { isSafePrivateReference } from './private-reference-policy.js'

const providerProfileChangePayloadSchema = z.object({
    name: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(5_000).nullable().optional(),
    phone: z.string().trim().min(5).max(32).nullable().optional(),
    phones: z.array(z.string().trim().min(5).max(32)).max(5).optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    websiteUrl: z.string().trim().url().max(500).nullable().optional(),
    metroStation: z.string().trim().max(120).nullable().optional(),
    warrantyText: z.string().trim().max(500).nullable().optional(),
    yearsActive: z.number().int().nonnegative().max(150).optional(),
    staffCount: z.number().int().nonnegative().max(10_000).optional(),
    workstationCount: z.number().int().nonnegative().max(100_000).optional(),
    amenityIds: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
    brandSpecializations: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    isMultibrand: z.boolean().optional(),
    documents: z.array(z.object({
        label: z.string().trim().min(1).max(160),
        reference: z.string().trim().max(500).refine(isSafePrivateReference, 'Document reference must be a private storage reference.'),
        expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    }).strict()).max(20).optional(),
}).strict()

const supportedProfileFields = new Set(Object.keys(providerProfileChangePayloadSchema.shape))

export function normalizeProviderProfileChangePayload(payload: Record<string, unknown>) {
    const unknownKeys = Object.keys(payload).filter((key) => !supportedProfileFields.has(key))
    if (unknownKeys.length > 0) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: `Unsupported provider profile fields: ${unknownKeys.join(', ')}.`,
        })
    }

    const parsed = providerProfileChangePayloadSchema.safeParse(payload)
    if (!parsed.success) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Provider profile change payload is invalid.',
        })
    }

    const value = parsed.data
    return {
        ...value,
        ...(value.phones ? { phones: [...new Set(value.phones)] } : {}),
        ...(value.amenityIds ? { amenityIds: [...new Set(value.amenityIds)] } : {}),
        ...(value.brandSpecializations ? { brandSpecializations: [...new Set(value.brandSpecializations)] } : {}),
        ...(value.documents ? {
            documents: value.documents.map((document) => ({
                ...document,
                reference: document.reference.trim(),
            })),
        } : {}),
    }
}
