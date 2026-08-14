import { z } from 'zod'

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

export type OwnerReadiness = z.infer<typeof ownerReadinessSchema>

export function normalizeOwnerReadiness(value: unknown): OwnerReadiness {
    return ownerReadinessSchema.parse(value)
}
