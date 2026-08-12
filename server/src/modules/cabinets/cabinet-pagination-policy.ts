export const MAX_CABINET_PAGE = 1_000
export const MAX_CABINET_PAGE_SIZE = 50

export function getCabinetPagination(page = 1, limit = 12) {
    if (
        !Number.isSafeInteger(page) || page < 1 || page > MAX_CABINET_PAGE
        || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_CABINET_PAGE_SIZE
    ) {
        throw new Error('Cabinet pagination is invalid.')
    }

    return { page, limit }
}
