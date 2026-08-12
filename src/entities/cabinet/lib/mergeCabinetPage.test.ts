import { describe, expect, it } from 'vitest'

import type { CabinetPageResponse } from './cabinet-response-schema'
import { mergeCabinetPage } from './mergeCabinetPage'

const cabinet = (id: string, title = id) => ({
    id,
    ownerId: 'owner-1',
    title,
    description: 'Description',
    address: 'Address',
    city: 'City',
    pricePerHour: 100,
    status: 'active' as const,
    photos: [],
    createdAt: '2026-01-01T00:00:00.000Z',
})

const page = (items: CabinetPageResponse['items'], pageNumber: number): CabinetPageResponse => ({
    items,
    total: 3,
    page: pageNumber,
    totalPages: 2,
})

describe('mergeCabinetPage', () => {
    it('replaces the cache for the first page', () => {
        const result = mergeCabinetPage(
            page([cabinet('old')], 1),
            page([cabinet('fresh')], 1),
            1,
        )

        expect(result.items.map(({ id }) => id)).toEqual(['fresh'])
    })

    it('appends new cabinets and replaces repeated ids without duplicates', () => {
        const result = mergeCabinetPage(
            page([cabinet('one'), cabinet('two', 'Old title')], 1),
            page([cabinet('two', 'Updated title'), cabinet('three')], 2),
            2,
        )

        expect(result.items.map(({ id }) => id)).toEqual(['one', 'two', 'three'])
        expect(result.items[1]?.title).toBe('Updated title')
        expect(result.page).toBe(2)
    })
})
