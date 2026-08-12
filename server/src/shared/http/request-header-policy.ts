import { stripControlCharacters } from '../security/string-normalization.js'

export const MAX_REQUEST_IP_LENGTH = 64
export const MAX_REQUEST_USER_AGENT_LENGTH = 512
export const MAX_REQUEST_CORRELATION_ID_LENGTH = 128

export function normalizeRequestHeader(
    value: string | null | undefined,
    maxLength: number,
) {
    if (value === null || value === undefined) return null

    return stripControlCharacters(value).trim().slice(0, maxLength) || null
}
