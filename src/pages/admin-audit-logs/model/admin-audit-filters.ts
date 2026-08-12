const STORAGE_KEY = 'autocare-hub:admin-audit-filter:v1'
const MAX_STORAGE_BYTES = 2_048
const MAX_QUERY_LENGTH = 160

export type AdminAuditFilter = {
    query: string
}

function getSessionStorage(): Storage | null {
    if (typeof window === 'undefined') return null

    try {
        return window.sessionStorage ?? null
    } catch {
        return null
    }
}

function normalizeQuery(value: unknown) {
    if (typeof value !== 'string') return ''

    return Array.from(value, (character) => {
        const code = character.charCodeAt(0)
        const isControlCharacter = code < 32 || code === 127
        const isWhitespace = character === ' ' || character === '\t' || character === '\n' || character === '\r'

        return isControlCharacter ? (isWhitespace ? ' ' : '') : character
    }).join('')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_QUERY_LENGTH)
}

export function readAdminAuditFilter(): AdminAuditFilter | null {
    const storage = getSessionStorage()
    if (!storage) return null

    try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw || raw.length > MAX_STORAGE_BYTES) return null

        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null

        const query = normalizeQuery((parsed as { query?: unknown }).query)
        return query ? { query } : null
    } catch {
        return null
    }
}

export function writeAdminAuditFilter(query: string) {
    const storage = getSessionStorage()
    const normalizedQuery = normalizeQuery(query)
    if (!storage || !normalizedQuery) return false

    try {
        const serialized = JSON.stringify({ query: normalizedQuery } satisfies AdminAuditFilter)
        if (serialized.length > MAX_STORAGE_BYTES) return false
        storage.setItem(STORAGE_KEY, serialized)
        return true
    } catch {
        return false
    }
}

export function clearAdminAuditFilter() {
    const storage = getSessionStorage()
    if (!storage) return

    try {
        storage.removeItem(STORAGE_KEY)
    } catch {
        // Session storage can be unavailable in privacy-restricted contexts.
    }
}
