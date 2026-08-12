import { describe, expect, it } from 'vitest'

import { getReconciliationRetryDecision } from './reconciliation-retry.js'

describe('reconciliation retry decisions', () => {
    it('retries transient provider failures', () => {
        expect(getReconciliationRetryDecision({ type: 'StripeConnectionError' })).toBe('retry')
    })

    it('ignores permanent payment failures and escalates unknown errors', () => {
        expect(getReconciliationRetryDecision({ type: 'StripeCardError' })).toBe('ignore')
        expect(getReconciliationRetryDecision(new Error('unexpected'))).toBe('escalate')
    })
})
