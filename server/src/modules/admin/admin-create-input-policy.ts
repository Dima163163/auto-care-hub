import { normalizeLocale, type SupportedLocale } from '../../config/i18n.js'
import { normalizeAuthEmail } from '../auth/email-policy.js'
import { normalizeAuthUserName } from '../auth/user-input-policy.js'
import { normalizeFrontendOrigin } from '../../shared/security/frontend-origin-policy.js'

const INPUT_KEYS = new Set(['name', 'email'])

type RecordInput = Record<string, unknown>

function asRecord(value: unknown): RecordInput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as RecordInput
}

export type NormalizedCreateAdminInput = {
    name: string
    email: string
    frontendOrigin: string
    locale?: SupportedLocale
}

export function normalizeCreateAdminInput(
    value: unknown,
    frontendOrigin: unknown,
    locale: unknown,
): NormalizedCreateAdminInput | null {
    const input = asRecord(value)
    if (!input || Object.keys(input).some((key) => !INPUT_KEYS.has(key))) return null

    if (typeof input.name !== 'string' || typeof input.email !== 'string') return null
    let name: string
    let email: string
    try {
        name = normalizeAuthUserName(input.name.normalize('NFKC'))
        email = normalizeAuthEmail(input.email.normalize('NFKC'))
    } catch {
        return null
    }

    if (typeof frontendOrigin !== 'string') return null
    let normalizedOrigin: string
    try {
        normalizedOrigin = normalizeFrontendOrigin(frontendOrigin, { allowHttpLoopback: true })
    } catch {
        return null
    }

    let normalizedLocale: SupportedLocale | undefined
    if (locale !== undefined) {
        if (typeof locale !== 'string') return null
        normalizedLocale = normalizeLocale(locale)
        if (!normalizedLocale) return null
    }

    return {
        name,
        email,
        frontendOrigin: normalizedOrigin,
        ...(normalizedLocale ? { locale: normalizedLocale } : {}),
    }
}
