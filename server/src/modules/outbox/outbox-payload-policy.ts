export const MAX_OUTBOX_PAYLOAD_DEPTH = 6
export const MAX_OUTBOX_PAYLOAD_KEYS = 128
const FORBIDDEN_SECRET_KEYS = new Set([
    'token',
    'password',
    'passwordhash',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'secret',
])

function walkPayload(value: unknown, depth: number, keyCount: { value: number }) {
    if (depth > MAX_OUTBOX_PAYLOAD_DEPTH) {
        throw new Error('Outbox payload nesting is too deep.')
    }

    if (Array.isArray(value)) {
        if (value.length > MAX_OUTBOX_PAYLOAD_KEYS) {
            throw new Error('Outbox payload array is too large.')
        }
        for (const item of value) walkPayload(item, depth + 1, keyCount)
        return
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
        keyCount.value += entries.length
        if (keyCount.value > MAX_OUTBOX_PAYLOAD_KEYS) {
            throw new Error('Outbox payload has too many keys.')
        }
        for (const [key, item] of entries) {
            if (FORBIDDEN_SECRET_KEYS.has(key.toLowerCase())) {
                throw new Error(`Outbox payload contains forbidden secret field: ${key}.`)
            }
            walkPayload(item, depth + 1, keyCount)
        }
    }
}

export function assertOutboxPayloadShape(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Outbox payload must be an object.')
    }

    walkPayload(payload, 0, { value: 0 })
    return payload
}
