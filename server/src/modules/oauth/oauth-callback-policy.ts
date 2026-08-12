import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_OAUTH_CODE_LENGTH = 2_048
export const MAX_OAUTH_ERROR_LENGTH = 120
export const MAX_OAUTH_ERROR_DESCRIPTION_LENGTH = 500

function normalizeOptional(value: string | undefined, maxLength: number, label: string) {
    if (value === undefined) return undefined

    const normalized = normalizeTextWhitespace(value).replace(/\s+/g, ' ').trim()
    if (!normalized || normalized.length > maxLength) {
        throw new Error(`OAuth ${label} is invalid.`)
    }

    return normalized
}

export function normalizeOAuthCallbackCode(code: string) {
    return normalizeOptional(code, MAX_OAUTH_CODE_LENGTH, 'code') ?? ''
}

export function normalizeOAuthCallbackError(error: string | undefined) {
    return normalizeOptional(error, MAX_OAUTH_ERROR_LENGTH, 'error')
}

export function normalizeOAuthCallbackErrorDescription(description: string | undefined) {
    return normalizeOptional(description, MAX_OAUTH_ERROR_DESCRIPTION_LENGTH, 'error description')
}
