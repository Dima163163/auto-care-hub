import { type QueryFailedError } from 'typeorm'
import { type ServiceMessageOffer, ServiceRequestEntity } from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { CreateAutoCareServiceRequestInput } from './autocare.types.js'

export function isRequestIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined
    return driverError?.code === '23505' && driverError.constraint === 'IDX_autocare_service_requests_client_idempotency_key'
}

export function isMessageIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined
    return driverError?.code === '23505' && driverError.constraint === 'IDX_autocare_service_messages_idempotency'
}

/**
 * JSONB does not promise to preserve the insertion order of object keys. Use a
 * canonical representation for idempotency comparisons so a retried request
 * is treated as the same payload even when PostgreSQL returns keys in a
 * different order than the original JSON body.
 */
function stableJsonStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(',')}]`
    if (value !== null && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => `${JSON.stringify(key)}:${stableJsonStringify(item)}`)
            .join(',')}}`
    }
    return JSON.stringify(value)
}

export function isSameAutoCareServiceRequest(request: ServiceRequestEntity, input: CreateAutoCareServiceRequestInput) {
    return request.providerId === input.providerId &&
        request.locationId === input.locationId &&
        request.offeringId === input.offeringId &&
        request.preferredAt?.toISOString() === new Date(input.preferredAt).toISOString() &&
        request.vehicleId === (input.vehicleId ?? null) &&
        (input.vehicleId ? true : stableJsonStringify(request.vehicleSnapshot) === stableJsonStringify(input.vehicleSnapshot ?? null)) &&
        stableJsonStringify(request.contactSnapshot) === stableJsonStringify(input.contactSnapshot) &&
        request.note === (input.note ?? null)
}

export function requestIdempotencyConflict(): never {
    throw new AppError({
        statusCode: 409,
        code: ERROR_CODES.Conflict,
        message: 'Idempotency key was already used for another service request.',
    })
}

export function messageIdempotencyConflict(): never {
    throw new AppError({
        statusCode: 409,
        code: ERROR_CODES.Conflict,
        message: 'Idempotency key was already used for another message.',
    })
}

export function sameServiceOffer(a: ServiceMessageOffer, b: ServiceMessageOffer, compareCoupon: boolean) {
    return a.type === b.type &&
        a.title === b.title &&
        a.description === b.description &&
        a.discountPercent === b.discountPercent &&
        (!compareCoupon || a.couponCode === b.couponCode) &&
        a.amountMinor === b.amountMinor &&
        a.currencyCode === b.currencyCode &&
        a.expiresAt === b.expiresAt &&
        a.status === 'pending'
}
