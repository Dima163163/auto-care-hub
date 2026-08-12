export const MAX_MAINTENANCE_REMINDER_CANDIDATES = 2_000
export const MAX_MAINTENANCE_REFERENCED_PHOTOS = 50_000

export function assertMaintenanceReferenceCount(count: number) {
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_MAINTENANCE_REFERENCED_PHOTOS) {
        throw new Error('Maintenance image reference count is outside accepted bounds.')
    }
}
