import { describe, expect, it } from 'vitest'
import { parseUserProfileBindingBackfillOptions } from './backfill-user-profile-record-binding.js'

describe('user profile record binding backfill options', () => {
    it('accepts bounded work and rejects unsupported modes or budgets', () => {
        expect(parseUserProfileBindingBackfillOptions(['--mode', 'apply']))
            .toEqual({ mode: 'apply', batchSize: 100, maxBatches: 100 })
        expect(parseUserProfileBindingBackfillOptions(['--mode', 'verify', '--batch-size', '500', '--max-batches', '10000']))
            .toEqual({ mode: 'verify', batchSize: 500, maxBatches: 10000 })
        expect(() => parseUserProfileBindingBackfillOptions(['--mode', 'delete']))
            .toThrow('Invalid user profile binding mode.')
        expect(() => parseUserProfileBindingBackfillOptions(['--mode', 'apply', '--batch-size', '501']))
            .toThrow('Invalid user profile binding batch budget.')
        expect(() => parseUserProfileBindingBackfillOptions(['--mode', 'apply', '--mode', 'reset']))
            .toThrow('Use --mode')
    })
})
