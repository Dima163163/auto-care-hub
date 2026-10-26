import { describe, expect, it } from 'vitest'
import { parseMessageBodyBindingBackfillOptions } from './backfill-message-body-record-binding.js'

describe('message body record binding backfill command', () => {
    it('bounds batch size and rejects an ambiguous mode', () => {
        expect(parseMessageBodyBindingBackfillOptions(['--mode', 'apply', '--batch-size', '500'])).toMatchObject({ mode: 'apply', batchSize: 500 })
        expect(() => parseMessageBodyBindingBackfillOptions(['--mode', 'apply', '--batch-size', '501'])).toThrow('Invalid message body binding batch budget.')
        expect(() => parseMessageBodyBindingBackfillOptions(['--mode', 'apply', '--mode', 'verify'])).toThrow()
        expect(() => parseMessageBodyBindingBackfillOptions(['--mode', 'run'])).toThrow('Invalid message body binding mode.')
    })
})
