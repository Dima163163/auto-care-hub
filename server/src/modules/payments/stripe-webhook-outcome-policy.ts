export type StripeWebhookFailureDisposition = 'failed' | 'unmatched'

export function getStripeWebhookFailureDisposition(errorMessage: string): StripeWebhookFailureDisposition {
    const normalized = errorMessage.toLowerCase()
    return normalized.includes('metadata is missing or invalid')
        || normalized.includes('could not be matched')
        ? 'unmatched'
        : 'failed'
}
