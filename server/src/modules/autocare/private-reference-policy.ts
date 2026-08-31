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
