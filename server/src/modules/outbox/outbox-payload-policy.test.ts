import { describe, expect, it } from 'vitest'

import {
    MAX_OUTBOX_PAYLOAD_DEPTH,
    MAX_OUTBOX_PAYLOAD_KEYS,
    assertOutboxPayloadShape,
} from './outbox-payload-policy.js'

describe('outbox payload shape policy', () => {
    it('accepts bounded object payloads', () => {
        expect(assertOutboxPayloadShape({ event: 'booking', data: { id: '1' } })).toEqual({
            event: 'booking',
            data: { id: '1' },
        })
    })

    it('rejects arrays, deep objects, and oversized collections', () => {
        expect(() => assertOutboxPayloadShape([])).toThrow(/object/)
        let nested: unknown = 'value'
        for (let index = 0; index <= MAX_OUTBOX_PAYLOAD_DEPTH; index += 1) nested = { nested }
        expect(() => assertOutboxPayloadShape(nested)).toThrow(/deep/)
        expect(() => assertOutboxPayloadShape(Object.fromEntries(
            Array.from({ length: MAX_OUTBOX_PAYLOAD_KEYS + 1 }, (_, index) => [`key${index}`, index]),
        ))).toThrow(/keys/)
    })
})
