import { describe, expect, it } from 'vitest'

import { getProbeFailureReason } from './health.route.js'

describe('health probe diagnostics', () => {
    it('maps bounded probe timeout errors to the timeout reason', () => {
        expect(getProbeFailureReason(new Error('postgresql probe timed out.'))).toBe('timeout')
    })

    it('maps provider errors to a generic unavailable reason', () => {
        expect(getProbeFailureReason(new Error('password=secret connection refused'))).toBe('unavailable')
        expect(getProbeFailureReason({ message: 'unknown failure' })).toBe('unavailable')
    })

    it('exposes a bounded schema-contract reason without raw SQL', () => {
        expect(getProbeFailureReason(new Error(
            'Database schema contract is incomplete: security_events.type',
        ))).toBe('schema_contract_incomplete')
    })
})
