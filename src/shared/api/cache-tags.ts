export function getCabinetAvailabilityInvalidationTags(cabinetId: string) {
    return [
        { type: 'Booking' as const, id: 'OCCUPIED_SLOTS' },
        { type: 'Cabinet' as const, id: cabinetId },
        { type: 'Cabinet' as const, id: 'LIST' },
        { type: 'Cabinet' as const, id: 'ALL_LIST' },
    ]
}

export function getCabinetReviewInvalidationTags(cabinetId: string) {
    return [
        { type: 'Cabinet' as const, id: cabinetId },
        { type: 'Cabinet' as const, id: 'LIST' },
        { type: 'Cabinet' as const, id: 'ALL_LIST' },
    ]
}
