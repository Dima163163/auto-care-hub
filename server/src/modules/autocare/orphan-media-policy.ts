export type AutoCareMediaEntry = {
    fileName: string
    lastModifiedAt: number
}

export const MAX_AUTOMOTIVE_MEDIA_CLEANUP_BATCH = 200

export function selectOrphanAutoCareMedia(input: {
    entries: readonly AutoCareMediaEntry[]
    referencedFileNames: ReadonlySet<string>
    now: number
    gracePeriodMs: number
    limit?: number
}) {
    const limit = Math.max(1, Math.min(input.limit ?? MAX_AUTOMOTIVE_MEDIA_CLEANUP_BATCH, MAX_AUTOMOTIVE_MEDIA_CLEANUP_BATCH))
    return [...input.entries]
        .filter((entry) => !input.referencedFileNames.has(entry.fileName))
        .filter((entry) => input.now - entry.lastModifiedAt >= input.gracePeriodMs)
        // Directory iteration order is not a retention policy. Always remove
        // the oldest eligible objects first so a bounded cleanup converges
        // deterministically and does not starve older uploads.
        .sort((left, right) => left.lastModifiedAt - right.lastModifiedAt || left.fileName.localeCompare(right.fileName))
        .slice(0, limit)
}
