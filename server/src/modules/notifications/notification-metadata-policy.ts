import { isWithinUtf8ByteLimit } from '../../shared/security/request-limits.js'

export const MAX_NOTIFICATION_METADATA_BYTES = 16 * 1024
export const MAX_NOTIFICATION_METADATA_KEYS = 32

export function assertNotificationMetadataWithinBounds(metadata: Record<string, unknown>) {
    if (Object.keys(metadata).length > MAX_NOTIFICATION_METADATA_KEYS) {
        throw new Error('Notification metadata has too many keys.')
    }
    const serialized = JSON.stringify(metadata)
    if (serialized === undefined || !isWithinUtf8ByteLimit(serialized, MAX_NOTIFICATION_METADATA_BYTES)) {
        throw new Error('Notification metadata is too large.')
    }
    return metadata
}
