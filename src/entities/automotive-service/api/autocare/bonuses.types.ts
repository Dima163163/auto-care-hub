

export type OwnerAutoCareBonusLiability = {
    providerId: string
    activeAccounts: number
    liabilityPoints: number
    entries: Array<{
        id: string
        clientId: string
        clientName: string
        type: 'earn' | 'redeem' | 'refund' | 'expire' | 'adjustment'
        points: number
        reason: string
        requestId: string | null
        expiresAt: string | null
        createdAt: string
    }>
}

export type AutoCareBonusProgram = {
    id: string
    providerId: string
    name: string
    earnPercent: number
    maxEarnPointsPerVisit: number | null
    expiresAfterDays: number | null
    active: boolean
    createdAt: string
    updatedAt: string
}

export type AutoCareBonusLedgerEntry = {
    id: string
    type: 'earn' | 'redeem' | 'refund' | 'expire' | 'adjustment'
    points: number
    reason: string
    requestId: string | null
    expiresAt: string | null
    createdAt: string
}

export type AutoCareBonusAccount = {
    id: string
    providerId: string
    balancePoints: number
    earnedPoints: number
    redeemedPoints: number
    entries: AutoCareBonusLedgerEntry[]
}

export type OwnerAutoCareBonusProgramInput = {
    providerId: string
    name: string
    earnPercent: number
    maxEarnPointsPerVisit?: number | null
    expiresAfterDays?: number | null
    active?: boolean
}

export type RedeemAutoCareBonusInput = { providerId: string; requestId: string; points: number; idempotencyKey?: string }

export type GrantAutoCareBonusInput = { providerId: string; clientId: string; points: number; reason: string; idempotencyKey: string }
