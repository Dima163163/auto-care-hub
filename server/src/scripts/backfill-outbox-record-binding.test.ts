import { describe, expect, it } from 'vitest'
import { parseOutboxBindingBackfillOptions } from './backfill-outbox-record-binding.js'

describe('outbox binding backfill command', () => {
    it('accepts bounded apply, verify and reset modes', () => {
        expect(parseOutboxBindingBackfillOptions(['--mode', 'apply']))
            .toEqual({ mode: 'apply', batchSize: 100, maxBatches: 100 })
        expect(parseOutboxBindingBackfillOptions(['--mode', 'verify', '--batch-size', '500', '--max-batches', '10000']))
            .toEqual({ mode: 'verify', batchSize: 500, maxBatches: 10000 })
        expect(parseOutboxBindingBackfillOptions(['--mode', 'reset']).mode).toBe('reset')
    })

    it('rejects duplicate, unknown and unbounded options', () => {
        expect(() => parseOutboxBindingBackfillOptions(['--mode', 'apply', '--mode', 'reset'])).toThrow()
        expect(() => parseOutboxBindingBackfillOptions(['--mode', 'apply', '--table', 'users'])).toThrow()
        expect(() => parseOutboxBindingBackfillOptions(['--mode', 'verify', '--batch-size', '501'])).toThrow()
    })
})
