import { z } from 'zod'

import { AutomotiveProviderChangeRequestKind, AutomotiveProviderChangeRequestStatus } from '../../entities/automotive/provider-change-request.entity.js'
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
const changeRequestKinds = new Set<AutomotiveProviderChangeRequestKind>(Object.values(AutomotiveProviderChangeRequestKind))
const changeRequestStatuses = new Set<AutomotiveProviderChangeRequestStatus>(Object.values(AutomotiveProviderChangeRequestStatus))
const changeRequestDecisionStatuses = new Set<AutomotiveProviderChangeRequestStatus>([
    AutomotiveProviderChangeRequestStatus.Approved,
    AutomotiveProviderChangeRequestStatus.Rejected,
])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type NormalizedProviderChangeRequestQuery = {
    status?: AutomotiveProviderChangeRequestStatus
    kind?: AutomotiveProviderChangeRequestKind
}

export type NormalizedProviderChangeRequestInput = {
    kind: AutomotiveProviderChangeRequestKind
    payload: Record<string, unknown>
}

export function normalizeProviderChangeRequestUuid(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeProviderChangeRequestInput(input: unknown): NormalizedProviderChangeRequestInput | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => key !== 'kind' && key !== 'payload')) return null
    if (typeof value.kind !== 'string') return null
    const normalizedKind = value.kind.normalize('NFKC').trim().toLowerCase()
    if (!changeRequestKinds.has(normalizedKind as AutomotiveProviderChangeRequestKind)) return null
    const rawPayload = value.payload === undefined ? {} : value.payload
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) return null
    if (normalizedKind === AutomotiveProviderChangeRequestKind.Verification && Object.keys(rawPayload).length > 0) return null
    if (normalizedKind === AutomotiveProviderChangeRequestKind.Verification) {
        return { kind: AutomotiveProviderChangeRequestKind.Verification, payload: {} }
    }
    try {
        return {
            kind: AutomotiveProviderChangeRequestKind.ProfileUpdate,
            payload: normalizeProviderProfileChangePayload(rawPayload as Record<string, unknown>),
        }
    } catch {
        return null
    }
}

export function normalizeProviderChangeRequestQuery(status: unknown, kind: unknown): NormalizedProviderChangeRequestQuery | null {
    const normalizedStatus = status === undefined ? undefined : typeof status === 'string' ? status.normalize('NFKC').trim().toLowerCase() : null
    const normalizedKind = kind === undefined ? undefined : typeof kind === 'string' ? kind.normalize('NFKC').trim().toLowerCase() : null
    if (normalizedStatus !== undefined && (!normalizedStatus || !changeRequestStatuses.has(normalizedStatus as AutomotiveProviderChangeRequestStatus))) return null
    if (normalizedKind !== undefined && (!normalizedKind || !changeRequestKinds.has(normalizedKind as AutomotiveProviderChangeRequestKind))) return null
    return {
        ...(normalizedStatus !== undefined ? { status: normalizedStatus as AutomotiveProviderChangeRequestStatus } : {}),
        ...(normalizedKind !== undefined ? { kind: normalizedKind as AutomotiveProviderChangeRequestKind } : {}),
    }
}

export function normalizeProviderChangeRequestDecision(status: unknown, reason: unknown): { status: AutomotiveProviderChangeRequestStatus.Approved | AutomotiveProviderChangeRequestStatus.Rejected; reason: string | null } | null {
    const normalizedStatus = typeof status === 'string' ? status.normalize('NFKC').trim().toLowerCase() : null
    if (!normalizedStatus || !changeRequestDecisionStatuses.has(normalizedStatus as AutomotiveProviderChangeRequestStatus)) return null
    if (reason !== undefined && reason !== null && typeof reason !== 'string') return null
    if (typeof reason === 'string') {
        const normalizedReason = reason.normalize('NFKC').trim()
        if (normalizedReason.length > 2_000) return null
        return { status: normalizedStatus as AutomotiveProviderChangeRequestStatus.Approved | AutomotiveProviderChangeRequestStatus.Rejected, reason: normalizedReason || null }
    }
    return { status: normalizedStatus as AutomotiveProviderChangeRequestStatus.Approved | AutomotiveProviderChangeRequestStatus.Rejected, reason: null }
}

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
