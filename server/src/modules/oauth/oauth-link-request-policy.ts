export type OAuthLinkRequestDecision = 'ready' | 'missing' | 'wrong_provider' | 'wrong_purpose' | 'consumed' | 'expired'

export function getOAuthLinkRequestDecision(input: {
    exists: boolean
    providerMatches: boolean
    purposeMatches: boolean
    consumed: boolean
    expiresAt: Date | null
    now?: Date
}): OAuthLinkRequestDecision {
    if (!input.exists) return 'missing'
    if (!input.providerMatches) return 'wrong_provider'
    if (!input.purposeMatches) return 'wrong_purpose'
    if (input.consumed) return 'consumed'
    if (!input.expiresAt || input.expiresAt.getTime() <= (input.now ?? new Date()).getTime()) return 'expired'
    return 'ready'
}
