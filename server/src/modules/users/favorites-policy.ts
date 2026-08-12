export const MAX_FAVORITES_PER_USER = 100

export function normalizeFavoriteCabinetIds(cabinetIds: string[]) {
    const uniqueIds = [...new Set(cabinetIds)]
    if (uniqueIds.length > MAX_FAVORITES_PER_USER) {
        throw new Error('Too many favorite cabinets.')
    }

    return uniqueIds
}
