export function getMaintenanceBacklogAgeMs(
    oldestCreatedAt: Date | string | null | undefined,
    now = Date.now(),
) {
    if (!oldestCreatedAt) return 0

    const createdAtMs = new Date(oldestCreatedAt).getTime()
    if (!Number.isFinite(createdAtMs)) return 0

    return Math.max(0, now - createdAtMs)
}
