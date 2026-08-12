import { describe, expect, it } from 'vitest'

import { getCabinetFiltersFromSearchParams } from './useCabinets'

describe('cabinet catalog URL filters', () => {
    it('restores all structured filters from a shareable URL', () => {
        const params = new URLSearchParams(
            'search=studio&sortBy=popular&city=Berlin&category=beauty&minPrice=20&maxPrice=80&minRating=4.5&service=massage&availableToday=true&date=2026-08-05&duration=90',
        )

        expect(getCabinetFiltersFromSearchParams(params)).toEqual({
            search: 'studio',
            sortBy: 'popular',
            filters: {
                city: 'Berlin',
                category: 'beauty',
                minPrice: '20',
                maxPrice: '80',
                minRating: '4.5',
                service: 'massage',
                availableToday: true,
                date: '2026-08-05',
                duration: '90',
            },
        })
    })

    it('falls back to the newest sort and empty filters for invalid values', () => {
        expect(getCabinetFiltersFromSearchParams(new URLSearchParams('sortBy=unknown&minPrice=nope&minRating=6'))).toEqual({
            search: '',
            sortBy: 'newest',
            filters: {
                city: '',
                category: '',
                minPrice: '',
                maxPrice: '',
                minRating: '',
                service: '',
                availableToday: false,
                date: '',
                duration: '',
            },
        })
    })

    it('rejects unsupported sort values through the runtime schema', () => {
        expect(
            getCabinetFiltersFromSearchParams(
                new URLSearchParams('sortBy=recently-added&availableToday=TRUE'),
            ),
        ).toMatchObject({
            sortBy: 'newest',
            filters: { availableToday: false },
        })
    })
})
