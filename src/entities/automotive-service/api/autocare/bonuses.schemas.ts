import { z } from 'zod'
import type { AutoCareBonusAccount, AutoCareBonusProgram, OwnerAutoCareBonusLiability } from './bonuses.types'

export const autoCareBonusProgramSchema = z.object({
    id: z.string(), providerId: z.string(), name: z.string(), earnPercent: z.number().finite().min(0).max(100),
    maxEarnPointsPerVisit: z.number().int().positive().nullable(), expiresAfterDays: z.number().int().positive().nullable(), active: z.boolean(),
    createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
}).passthrough() satisfies z.ZodType<AutoCareBonusProgram>

export const autoCareBonusAccountSchema = z.object({
    id: z.string(), providerId: z.string(), balancePoints: z.number().int().nonnegative(), earnedPoints: z.number().int().nonnegative(), redeemedPoints: z.number().int().nonnegative(),
    entries: z.array(z.object({ id: z.string(), type: z.enum(['earn', 'redeem', 'refund', 'expire', 'adjustment']), points: z.number().int(), reason: z.string(), requestId: z.string().nullable(), expiresAt: z.string().datetime({ offset: true }).nullable(), createdAt: z.string().datetime({ offset: true }) }).passthrough()),
}).passthrough() satisfies z.ZodType<AutoCareBonusAccount>

export const autoCareBonusAccountsSchema = z.array(autoCareBonusAccountSchema)

export const ownerAutoCareBonusLiabilitySchema = z.object({
    providerId: z.string(), activeAccounts: z.number().int().nonnegative(), liabilityPoints: z.number().int().nonnegative(),
    entries: z.array(z.object({
        id: z.string(), clientId: z.string(), clientName: z.string(), type: z.enum(['earn', 'redeem', 'refund', 'expire', 'adjustment']),
        points: z.number().int(), reason: z.string(), requestId: z.string().nullable(), expiresAt: z.string().datetime({ offset: true }).nullable(), createdAt: z.string().datetime({ offset: true }),
    })),
}) satisfies z.ZodType<OwnerAutoCareBonusLiability>
