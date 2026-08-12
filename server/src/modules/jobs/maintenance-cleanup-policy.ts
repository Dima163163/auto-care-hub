export const DEFAULT_MAINTENANCE_DELETE_BATCH = 100
export const MAX_MAINTENANCE_DELETE_BATCH = 500

export function getMaintenanceDeleteBatchSize(size = DEFAULT_MAINTENANCE_DELETE_BATCH) {
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_MAINTENANCE_DELETE_BATCH) {
        throw new Error('Maintenance delete batch size is invalid.')
    }

    return size
}
