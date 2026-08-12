export function shouldRecordStripeWebhookFailureIncident(failurePersisted: boolean) {
    return failurePersisted
}

export type StripeWebhookFinalization = 'processed' | 'failed' | 'unmatched'

export function getStripeWebhookFinalizationResult(
    finalization: StripeWebhookFinalization,
    persisted: boolean,
) {
    return persisted ? finalization : 'lease_lost' as const
}
