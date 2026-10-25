import { describe, expect, it } from 'vitest'
import { parseEmailBindingBackfillOptions } from './backfill-email-record-binding.js'

describe('email record binding backfill options', () => {
    it('bounds the work and selects only the two identity tables', () => {
        expect(parseEmailBindingBackfillOptions(['--table', 'users', '--mode', 'apply']))
            .toEqual({ table: 'users', mode: 'apply', batchSize: 100, maxBatches: 100 })
        expect(parseEmailBindingBackfillOptions(['--table', 'autocare_provider_invitations', '--mode', 'verify', '--batch-size', '500', '--max-batches', '10000']))
            .toEqual({ table: 'autocare_provider_invitations', mode: 'verify', batchSize: 500, maxBatches: 10000 })
        expect(() => parseEmailBindingBackfillOptions(['--table', 'users; DROP TABLE users', '--mode', 'apply']))
            .toThrow('Invalid email binding table.')
        expect(() => parseEmailBindingBackfillOptions(['--table', 'users', '--mode', 'apply', '--batch-size', '501']))
            .toThrow('Invalid email binding batch budget.')
        expect(() => parseEmailBindingBackfillOptions(['--table', 'users', '--mode', 'apply', '--mode', 'reset']))
            .toThrow('Use --table')
    })
})
