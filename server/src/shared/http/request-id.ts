import { MAX_REQUEST_ID_LENGTH } from '../security/request-limits.js'

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/

export function sanitizeIncomingRequestId(value: unknown) {
    if (typeof value !== 'string') return undefined

    const normalized = value.trim()
    if (
        normalized.length > MAX_REQUEST_ID_LENGTH ||
        !REQUEST_ID_PATTERN.test(normalized)
    ) {
        return undefined
    }

    return normalized
}
