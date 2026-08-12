import { z } from 'zod'

const stripeConnectStatusSchema = z.object({
    connected: z.boolean(),
    detailsSubmitted: z.boolean(),
    chargesEnabled: z.boolean(),
    payoutsEnabled: z.boolean(),
})

const stripeOnboardingSchema = z.object({
    url: z.string().url().refine((value) => value.startsWith('https://'), {
        message: 'Onboarding URL must use HTTPS',
    }),
})

const ownerReadinessBlockerSchema = z.enum([
    'email_verification',
    'active_cabinet',
    'active_service',
    'schedule',
    'payout_account',
])

const ownerReadinessSchema = z.object({
    ready: z.boolean(),
    blockers: z.array(ownerReadinessBlockerSchema).max(5),
    checks: z.object({
        emailVerified: z.boolean(),
        activeCabinet: z.boolean(),
        activeService: z.boolean(),
        scheduleConfigured: z.boolean(),
        payoutAccount: z.enum(['ready', 'not_connected', 'pending', 'unavailable']),
    }),
})

export type StripeConnectStatus = z.infer<typeof stripeConnectStatusSchema>
export type StripeOnboardingResponse = z.infer<typeof stripeOnboardingSchema>
export type OwnerReadiness = z.infer<typeof ownerReadinessSchema>

export function normalizeStripeConnectStatus(value: unknown): StripeConnectStatus {
    return stripeConnectStatusSchema.parse(value)
}

export function normalizeStripeOnboardingResponse(value: unknown): StripeOnboardingResponse {
    return stripeOnboardingSchema.parse(value)
}

export function normalizeOwnerReadiness(value: unknown): OwnerReadiness {
    return ownerReadinessSchema.parse(value)
}
