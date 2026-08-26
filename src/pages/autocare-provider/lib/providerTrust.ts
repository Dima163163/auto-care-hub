import type { AutoCareTrustResponse } from '@/entities/automotive-service'

/** Only evidence that has passed moderation and is still valid is public. */
export function getPublicTrustEvidence(
    trust: Pick<AutoCareTrustResponse, 'evidence'> | undefined,
    now = Date.now(),
) {
    return (trust?.evidence ?? []).filter((item) => {
        const approved = item.status === 'verified' || item.status === 'approved'
        const expiresAt = item.expiresAt ? Date.parse(item.expiresAt) : Number.POSITIVE_INFINITY
        return approved && Number.isFinite(expiresAt) && expiresAt > now
    }).slice(0, 2)
}
