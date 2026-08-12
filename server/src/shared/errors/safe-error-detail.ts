import { serializeError } from '../observability/logger.js'

export const MAX_SAFE_ERROR_DETAIL_LENGTH = 500

export function getSafeErrorDetail(error: unknown, fallback = 'Unknown error') {
    const detail = serializeError(error).message

    if (!detail) {
        return fallback
    }

    const normalized = Array.from(detail)
        .map((character) => {
            const codePoint = character.codePointAt(0) ?? 0
            return codePoint < 32 || codePoint === 127 ? ' ' : character
        })
        .join('')

    return normalized.replace(/\s+/g, ' ').trim().slice(0, MAX_SAFE_ERROR_DETAIL_LENGTH)
}
