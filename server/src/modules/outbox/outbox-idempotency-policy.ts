import { stripControlCharacters } from '../../shared/security/string-normalization.js'

export const MAX_OUTBOX_IDEMPOTENCY_KEY_LENGTH = 255

export function normalizeOutboxIdempotencyKey(value: string) {
    const normalized = value.trim()
    if (
        normalized.length < 1
        || normalized.length > MAX_OUTBOX_IDEMPOTENCY_KEY_LENGTH
        || stripControlCharacters(normalized) !== normalized
    ) {
        throw new Error('Outbox idempotency key is invalid.')
    }

    return normalized
}
