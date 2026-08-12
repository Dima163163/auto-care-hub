import {
    MAX_AUDIT_METADATA_BYTES,
    isWithinUtf8ByteLimit,
} from '../../shared/security/request-limits.js'
import { redactAuditMetadata } from './audit-log-redaction.js'

export const MAX_AUDIT_ACTION_LENGTH = 100

export function normalizeAuditAction(action: string) {
    const normalized = action.trim()

    if (
        normalized.length < 1 ||
        normalized.length > MAX_AUDIT_ACTION_LENGTH ||
        !/^[a-z][a-z0-9_]*$/.test(normalized)
    ) {
        throw new Error('Audit action is invalid.')
    }

    return normalized
}

export function assertAuditMetadataWithinBounds(metadata: Record<string, unknown>) {
    const redactedMetadata = redactAuditMetadata(metadata)
    const serialized = JSON.stringify(redactedMetadata)

    if (
        serialized === undefined ||
        !isWithinUtf8ByteLimit(serialized, MAX_AUDIT_METADATA_BYTES)
    ) {
        throw new Error('Audit metadata is too large.')
    }

    return redactedMetadata
}
