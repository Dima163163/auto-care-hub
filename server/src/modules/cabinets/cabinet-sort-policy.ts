export const CABINET_SORT_OPTIONS = ['price_asc', 'price_desc', 'newest', 'popular'] as const
export type CabinetSortOption = typeof CABINET_SORT_OPTIONS[number]

export function assertCabinetSort(value: string | undefined): CabinetSortOption | undefined {
    if (value === undefined) return undefined
    if (!CABINET_SORT_OPTIONS.includes(value as CabinetSortOption)) {
        throw new Error('Cabinet sort option is invalid.')
    }
    return value as CabinetSortOption
}
