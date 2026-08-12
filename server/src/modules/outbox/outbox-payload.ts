import { assertOutboxPayloadShape } from './outbox-payload-policy.js'

export const MAX_OUTBOX_PAYLOAD_BYTES = 50_000

export function getOutboxPayloadByteLength(payload: unknown) {
    let serialized: string
    try {
        serialized = JSON.stringify(payload)
    } catch {
        throw new Error('Outbox payload must be JSON serializable.')
    }

    return Buffer.byteLength(serialized, 'utf8')
}

export function assertOutboxPayloadWithinBounds(payload: unknown) {
    assertOutboxPayloadShape(payload)
    const bytes = getOutboxPayloadByteLength(payload)
    if (bytes > MAX_OUTBOX_PAYLOAD_BYTES) {
        throw new Error(`Outbox payload must be ${MAX_OUTBOX_PAYLOAD_BYTES} bytes or smaller.`)
    }

    return payload
}
