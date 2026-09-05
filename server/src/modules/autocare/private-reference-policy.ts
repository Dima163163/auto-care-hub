/**
 * Opaque references are identifiers, not URLs. Keeping each path segment
 * alphanumeric-led prevents traversal and ambiguous separators before a
 * storage adapter resolves the reference.
 */
export const PRIVATE_REFERENCE_PATTERN = /^private:\/\/[A-Za-z0-9][A-Za-z0-9_-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/

export function isSafePrivateReference(value: string | null | undefined) {
    const normalized = value?.trim()
    return Boolean(normalized && normalized.length <= 500 && PRIVATE_REFERENCE_PATTERN.test(normalized))
}

export function normalizePrivateReference(value: string | null | undefined) {
    const normalized = value?.trim()
    return normalized && isSafePrivateReference(normalized) ? normalized : null
}

export function isSafeAutoCareMediaReference(
    value: string | null | undefined,
    scopes: readonly string[],
) {
    const normalized = value?.trim()
    return Boolean(
        normalized
        && isSafePrivateReference(normalized)
        && scopes.some((scope) => normalized.startsWith(`private://autocare/${scope}/`)),
    )
}

export function normalizeAutoCareMediaReferences(
    values: readonly unknown[] | null | undefined,
    scopes: readonly string[],
    maxItems = 20,
) {
    if (!Array.isArray(values) || values.length > maxItems) return null
    const normalized = values.map((value) => typeof value === 'string' ? value.trim() : '')
    return normalized.every((value) => isSafeAutoCareMediaReference(value, scopes)) ? normalized : null
}

export type AutoCarePrivateDocument = {
    label: string
    reference: string
    expiresAt: Date | null
}

export function normalizeAutoCarePrivateDocuments(
    values: readonly unknown[] | null | undefined,
    maxItems = 20,
): AutoCarePrivateDocument[] | null {
    if (values === null || values === undefined) return []
    if (!Array.isArray(values) || values.length > maxItems) return null

    const normalized = values.map((value): AutoCarePrivateDocument | null => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null
        const document = value as { label?: unknown; reference?: unknown; expiresAt?: unknown }
        const label = typeof document.label === 'string' ? document.label.trim() : ''
        const reference = typeof document.reference === 'string' ? normalizePrivateReference(document.reference) : null
        if (!label || label.length > 160 || !reference) return null

        if (document.expiresAt === null || document.expiresAt === undefined) {
            return { label, reference, expiresAt: null }
        }
        if (document.expiresAt instanceof Date) {
            return Number.isNaN(document.expiresAt.getTime())
                ? null
                : { label, reference, expiresAt: new Date(document.expiresAt.getTime()) }
        }
        if (typeof document.expiresAt !== 'string') return null
        const rawExpiresAt = document.expiresAt.trim()
        if (!rawExpiresAt || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(rawExpiresAt)) return null
        const expiresAt = new Date(rawExpiresAt)
        return Number.isNaN(expiresAt.getTime()) ? null : { label, reference, expiresAt }
    })

    return normalized.every((document): document is AutoCarePrivateDocument => document !== null) ? normalized : null
}
