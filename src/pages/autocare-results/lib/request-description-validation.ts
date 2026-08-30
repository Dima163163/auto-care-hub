export const MIN_REQUEST_DESCRIPTION_LENGTH = 10
export const MAX_REQUEST_DESCRIPTION_LENGTH = 4_000

export type RequestDescriptionValidation =
    | { valid: true; value: string }
    | { valid: false; reason: 'required' | 'too_short' | 'too_long' }

export function validateRequestDescription(value: string): RequestDescriptionValidation {
    const normalized = value.trim()
    if (!normalized) return { valid: false, reason: 'required' }
    if (normalized.length < MIN_REQUEST_DESCRIPTION_LENGTH) return { valid: false, reason: 'too_short' }
    if (normalized.length > MAX_REQUEST_DESCRIPTION_LENGTH) return { valid: false, reason: 'too_long' }
    return { valid: true, value: normalized }
}
