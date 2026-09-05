export const MAX_FAVORITES_PER_USER = 100

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeFavoriteCabinetId(cabinetId: unknown): string | null {
    if (typeof cabinetId !== 'string') return null
    const normalized = cabinetId.trim().toLowerCase()
    return uuidPattern.test(normalized) ? normalized : null
}

export function normalizeFavoriteCabinetIds(cabinetIds: unknown) {
    if (!Array.isArray(cabinetIds)) throw new Error('Favorite cabinet ids are invalid.')
    const normalizedIds = cabinetIds.map((cabinetId) => normalizeFavoriteCabinetId(cabinetId))
    if (normalizedIds.some((cabinetId) => !cabinetId)) throw new Error('Favorite cabinet ids are invalid.')
    const uniqueIds = [...new Set(normalizedIds as string[])]
    if (uniqueIds.length > MAX_FAVORITES_PER_USER) {
        throw new Error('Too many favorite cabinets.')
    }

    return uniqueIds
}
