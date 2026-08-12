import { describe, expect, it } from 'vitest'

import { getOutboxBatchSize } from './outbox-batch-policy.js'

describe('outbox batch policy', () => {
    it('keeps the default and explicit batch sizes bounded', () => {
        expect(getOutboxBatchSize()).toBe(20)
        expect(getOutboxBatchSize(100)).toBe(100)
    })

    it('rejects unsafe batch sizes', () => {
        expect(() => getOutboxBatchSize(0)).toThrow(/invalid/)
        expect(() => getOutboxBatchSize(101)).toThrow(/invalid/)
    })
})
