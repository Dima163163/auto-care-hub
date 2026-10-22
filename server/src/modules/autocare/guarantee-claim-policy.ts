import { ServiceRequestStatus } from '../../entities/automotive/service-request.entity.js'

/** A guarantee complaint needs an actual booking or visit. No-show complaints
 * are only meaningful after the request enters the no-show state. */
export function isEligibleGuaranteeClaimRequest(status: ServiceRequestStatus, claimType: string) {
    if (claimType === 'no_show') return status === ServiceRequestStatus.NoShow
    return status === ServiceRequestStatus.Accepted || status === ServiceRequestStatus.Closed
}

type ClaimSignal = { requestId: string; caseKey?: string | null; status: string }

/** Duplicate legacy claims remain visible to their submitters, but count as
 * one unresolved case in the public signal. Resolution removes that signal. */
export function countActiveGuaranteeCases(claims: readonly ClaimSignal[]) {
    const canonical = new Map<string, ClaimSignal>()
    for (const claim of claims) {
        const selected = canonical.get(claim.requestId)
        if (!selected || claim.caseKey === claim.requestId) canonical.set(claim.requestId, claim)
    }
    return [...canonical.values()]
        .filter((claim) => !['resolved', 'rejected', 'closed'].includes(claim.status)).length
}
