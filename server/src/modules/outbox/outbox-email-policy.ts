import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_OUTBOX_RECIPIENT_NAME_LENGTH = 120
export const MAX_OUTBOX_EMAIL_TITLE_LENGTH = 160

export function normalizeOutboxEmailText(value: string, maxLength: number, label: string) {
    const normalized = normalizeTextWhitespace(value).replace(/\s+/g, ' ').trim()
    if (!normalized || normalized.length > maxLength) {
        throw new Error(`Outbox ${label} is invalid.`)
    }
    return normalized
}
