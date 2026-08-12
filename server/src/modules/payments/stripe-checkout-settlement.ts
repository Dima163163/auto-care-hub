import { z } from 'zod'

const checkoutMetadataSchema = z.object({
    bookingId: z.string().uuid(),
    paymentId: z.string().uuid(),
})

export function assertStripeCheckoutMetadata(metadata: Record<string, string> | null | undefined) {
    const result = checkoutMetadataSchema.safeParse(metadata ?? {})
    if (!result.success) {
        throw new Error('Stripe Checkout event metadata is missing or invalid.')
    }
    return result.data
}

export function assertPaymentTransitionMatched<T>(result: T | null) {
    if (result === null) {
        throw new Error('Stripe Checkout payment could not be matched to the stored booking.')
    }
    return result
}
