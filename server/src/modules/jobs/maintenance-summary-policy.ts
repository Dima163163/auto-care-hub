export const MAX_MAINTENANCE_SUMMARY_COUNT = 1_000_000

export function boundMaintenanceSummaryCount(value: number) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error('Maintenance summary count is invalid.')
    }

    return Math.min(value, MAX_MAINTENANCE_SUMMARY_COUNT)
}
