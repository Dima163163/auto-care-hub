import { classifyStripeFailure } from './stripe-failure.js'

export type ReconciliationRetryDecision = 'retry' | 'ignore' | 'escalate'

export function getReconciliationRetryDecision(error: unknown): ReconciliationRetryDecision {
    const classification = classifyStripeFailure(error)

    if (classification === 'transient') return 'retry'
    if (classification === 'permanent') return 'ignore'
    return 'escalate'
}
