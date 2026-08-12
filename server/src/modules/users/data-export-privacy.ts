import { stripControlCharacters } from '../../shared/security/string-normalization.js'

const EXPORT_METADATA_KEYS = new Set([
    'bookingId',
    'cabinetId',
    'reviewId',
    'serviceId',
    'status',
    'source',
    'type',
])
export const MAX_EXPORT_METADATA_KEYS = 32
export const MAX_EXPORT_METADATA_STRING_LENGTH = 512

function isExportSafePrimitive(value: unknown): value is string | number | boolean | null {
    return value === null || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value))
        || (typeof value === 'string' && value.length <= MAX_EXPORT_METADATA_STRING_LENGTH)
}

export function sanitizeExportMetadata(metadata: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(metadata)
            .filter(([key, value]) => EXPORT_METADATA_KEYS.has(key) && isExportSafePrimitive(value))
            .slice(0, MAX_EXPORT_METADATA_KEYS)
            .map(([key, value]) => [
                key,
                typeof value === 'string' ? stripControlCharacters(value) : value,
            ]),
    )
}
