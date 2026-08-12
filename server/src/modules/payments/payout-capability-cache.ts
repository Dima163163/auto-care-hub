export const DEFAULT_PAYOUT_CAPABILITY_TTL_MS = 5 * 60 * 1000

export function isPayoutCapabilityFresh(
    checkedAtMs: number | null,
    nowMs = Date.now(),
    ttlMs = DEFAULT_PAYOUT_CAPABILITY_TTL_MS,
) {
    if (checkedAtMs === null || !Number.isFinite(checkedAtMs) || !Number.isFinite(nowMs)) return false
    if (!Number.isFinite(ttlMs) || ttlMs < 1) return false

    return checkedAtMs <= nowMs && nowMs - checkedAtMs <= ttlMs
}
