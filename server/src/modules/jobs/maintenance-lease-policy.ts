export function assertMaintenanceLeaseTiming(leaseTtlMs: number, renewIntervalMs: number) {
    if (
        !Number.isSafeInteger(leaseTtlMs)
        || !Number.isSafeInteger(renewIntervalMs)
        || leaseTtlMs < 1
        || renewIntervalMs < 1
        || renewIntervalMs >= leaseTtlMs
    ) {
        throw new Error('Maintenance lease timing is invalid.')
    }
}
