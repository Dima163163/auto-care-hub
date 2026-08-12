export const MAX_AUDIT_TARGET_ID_LENGTH = 128
export const MAX_AUDIT_TARGET_TYPE_LENGTH = 100

export function normalizeAuditTarget(
    value: string | null | undefined,
    maxLength: number,
    field: string,
) {
    if (value == null) return undefined

    const normalized = value.trim()
    if (normalized.length < 1 || normalized.length > maxLength) {
        throw new Error(`Audit ${field} is invalid.`)
    }

    return normalized
}
