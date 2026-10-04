import { type QueryFailedError } from 'typeorm'
import { fail } from './chat-errors.js'

export function isChatMessageIdempotencyUniqueError(error: unknown) {
    const driverError = (error as QueryFailedError | undefined)?.driverError as
        | { code?: unknown; constraint?: unknown }
        | undefined
    return driverError?.code === '23505' && [
        'IDX_autocare_service_messages_thread_idempotency',
        // Request-scoped messages keep the existing request-level uniqueness
        // rule. A collision there can occur if a retry crosses API channels.
        'IDX_autocare_service_messages_idempotency',
    ].includes(String(driverError.constraint))
}

export function chatMessageIdempotencyConflict(): never {
    fail(409, 'Idempotency key was already used for a different message.')
}
