import { normalizeTextWhitespace } from '../../shared/security/string-normalization.js'

export const MAX_ACCOUNT_DELETION_REASON_LENGTH = 500

export function normalizeAccountDeletionReason(reason: string | undefined) {
    if (reason === undefined) return null

    const normalized = normalizeTextWhitespace(reason).replace(/\s+/g, ' ').trim()
    if (normalized.length > MAX_ACCOUNT_DELETION_REASON_LENGTH) {
        throw new Error('Account deletion reason is too long.')
    }

    return normalized || null
}
