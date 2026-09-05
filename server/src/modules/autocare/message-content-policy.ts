import { normalizeIdempotencyKey } from '../../shared/http/idempotency-key.js'

export const MAX_AUTOCARE_MESSAGE_LENGTH = 4_000

/**
 * Message routes validate this value with Zod, but service functions are also
 * callable directly. Normalize at the persistence boundary so empty or
 * oversized bodies cannot be written by an internal caller or a replay.
 */
export function normalizeAutoCareMessageBody(value: unknown) {
    if (typeof value !== 'string') return null
    const body = value.normalize('NFKC').trim()
    return body.length >= 1 && body.length <= MAX_AUTOCARE_MESSAGE_LENGTH ? body : null
}

export function normalizeAutoCareChatMessageInput(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => key !== 'body')) return null
    const body = normalizeAutoCareMessageBody(value.body)
    return body ? { body } : null
}

export function normalizeAutoCareServiceMessageInput(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => key !== 'body' && key !== 'idempotencyKey')) return null
    const body = normalizeAutoCareMessageBody(value.body)
    if (!body) return null
    const idempotencyKey = normalizeIdempotencyKey(value.idempotencyKey)
    return { body, ...(idempotencyKey ? { idempotencyKey } : {}) }
}
