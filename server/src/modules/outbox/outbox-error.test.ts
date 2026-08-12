import { describe, expect, it } from 'vitest'

import { normalizeOutboxError, OUTBOX_MAX_ERROR_LENGTH } from './outbox.service.js'

describe('outbox failure normalization', () => {
    it('bounds messages and redacts credential markers', () => {
        expect(normalizeOutboxError(new Error(`password=secret ${'x'.repeat(2_000)}`)))
            .toBe('[REDACTED_ERROR_MESSAGE]')
        expect(normalizeOutboxError(new Error('x'.repeat(2_000))).length)
            .toBeLessThanOrEqual(OUTBOX_MAX_ERROR_LENGTH)
    })
})
