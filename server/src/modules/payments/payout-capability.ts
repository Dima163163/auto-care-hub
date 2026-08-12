export type PayoutCapabilityDecision = 'enabled' | 'pending' | 'disabled'

export function getPayoutCapabilityDecision(input: {
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
}): PayoutCapabilityDecision {
    if (input.chargesEnabled && input.payoutsEnabled && input.detailsSubmitted) return 'enabled'
    if (input.detailsSubmitted || input.chargesEnabled || input.payoutsEnabled) return 'pending'
    return 'disabled'
}
