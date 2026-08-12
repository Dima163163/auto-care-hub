export const MAX_ORPHAN_IMAGE_SCAN = 500

export function isOrphanImageEntryOlderThan(
    lastModifiedAt: number,
    now: number,
    gracePeriodMs: number,
) {
    if (!Number.isFinite(lastModifiedAt) || !Number.isFinite(now) || !Number.isFinite(gracePeriodMs) || gracePeriodMs < 0) {
        throw new Error('Orphan image age values are invalid.')
    }

    return lastModifiedAt <= now - gracePeriodMs
}

export function selectOrphanImageEntries<T>(
    entries: readonly T[],
    maxEntries = MAX_ORPHAN_IMAGE_SCAN,
) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
        throw new Error('Orphan image scan limit must be a positive integer.')
    }

    return entries.slice(0, maxEntries)
}
