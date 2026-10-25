import { describe, expect, it } from 'vitest'
import { parseOAuthBindingBackfillOptions } from './backfill-oauth-record-binding.js'

describe('OAuth record binding backfill options', () => {
    it('accepts bounded work and rejects unsupported modes or budgets', () => {
        expect(parseOAuthBindingBackfillOptions(['--mode', 'apply']))
            .toEqual({ mode: 'apply', batchSize: 100, maxBatches: 100 })
        expect(parseOAuthBindingBackfillOptions(['--mode', 'verify', '--batch-size', '500', '--max-batches', '10000']))
            .toEqual({ mode: 'verify', batchSize: 500, maxBatches: 10000 })
        expect(() => parseOAuthBindingBackfillOptions(['--mode', 'delete'])).toThrow('Invalid OAuth binding mode.')
        expect(() => parseOAuthBindingBackfillOptions(['--mode', 'apply', '--batch-size', '501']))
            .toThrow('Invalid OAuth binding batch budget.')
        expect(() => parseOAuthBindingBackfillOptions(['--mode', 'apply', '--mode', 'reset']))
            .toThrow('Use --mode')
    })
})
