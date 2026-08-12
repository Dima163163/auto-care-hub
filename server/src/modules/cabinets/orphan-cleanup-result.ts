export type OrphanCleanupResult = {
    scanned: number
    removed: number
    failed: number
}

export function normalizeOrphanCleanupResult(result: OrphanCleanupResult) {
    const values = [result.scanned, result.removed, result.failed]
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('Orphan cleanup result is invalid.')
    }
    if (result.removed + result.failed > result.scanned) {
        throw new Error('Orphan cleanup result is inconsistent.')
    }
    return result
}
