import type { CabinetPageResponse } from './cabinet-response-schema'

export function mergeCabinetPage(
    current: CabinetPageResponse,
    incoming: CabinetPageResponse,
    page: number | undefined,
): CabinetPageResponse {
    if (!page || page <= 1) {
        return incoming
    }

    const items = [...current.items]
    const indexById = new Map(items.map((cabinet, index) => [cabinet.id, index]))

    incoming.items.forEach((cabinet) => {
        const existingIndex = indexById.get(cabinet.id)

        if (existingIndex === undefined) {
            indexById.set(cabinet.id, items.length)
            items.push(cabinet)
            return
        }

        items[existingIndex] = cabinet
    })

    return {
        ...incoming,
        items,
    }
}
