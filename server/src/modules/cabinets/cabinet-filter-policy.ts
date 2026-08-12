export const MAX_CABINET_PRICE_FILTER = 1_000_000

export function assertCabinetNumericFilters(input: {
    minPrice?: number
    maxPrice?: number
    minRating?: number
}) {
    const prices = [input.minPrice, input.maxPrice].filter((value): value is number => value !== undefined)
    if (prices.some((value) => !Number.isFinite(value) || value < 0 || value > MAX_CABINET_PRICE_FILTER)) {
        throw new Error('Cabinet price filter is invalid.')
    }
    if (input.minPrice !== undefined && input.maxPrice !== undefined && input.minPrice > input.maxPrice) {
        throw new Error('Cabinet price filter range is invalid.')
    }
    if (input.minRating !== undefined && (!Number.isFinite(input.minRating) || input.minRating < 1 || input.minRating > 5)) {
        throw new Error('Cabinet rating filter is invalid.')
    }
}
