export const MAX_FASTIFY_JSON_BODY_BYTES = 2_000_000
export const MAX_REQUEST_ID_LENGTH = 128
export const MAX_CURSOR_LENGTH = 2_048
export const MAX_AUDIT_METADATA_BYTES = 16_384
export const MAX_INCIDENT_METADATA_BYTES = 16_384

export function getUtf8ByteLength(value: string) {
    return Buffer.byteLength(value, 'utf8')
}

export function isWithinUtf8ByteLimit(value: string, maxBytes: number) {
    return getUtf8ByteLength(value) <= maxBytes
}

export function assertPositiveByteLimit(maxBytes: number) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
        throw new Error('Byte limit must be a positive safe integer.')
    }
}
