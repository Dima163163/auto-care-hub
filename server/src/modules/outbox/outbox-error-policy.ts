import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_OUTBOX_ERROR_LENGTH = 1_000

export function normalizeOutboxErrorMessage(value: string) {
    const normalized = normalizeTextWhitespace(value).replace(/\s+/g, ' ').trim()
    return (normalized || 'Unknown outbox error').slice(0, MAX_OUTBOX_ERROR_LENGTH)
}
