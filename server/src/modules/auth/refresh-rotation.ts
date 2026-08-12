export type RefreshRotationDecision = 'rotate' | 'expired' | 'revoked_or_missing'

export function getRefreshRotationDecision(input: {
    sessionFound: boolean
    expired: boolean
    revoked: boolean
}): RefreshRotationDecision {
    if (!input.sessionFound || input.revoked) return 'revoked_or_missing'
    if (input.expired) return 'expired'
    return 'rotate'
}
